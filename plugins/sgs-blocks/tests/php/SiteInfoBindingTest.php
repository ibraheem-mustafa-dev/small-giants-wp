<?php
/**
 * Sgs_Site_Info_Binding: the bound attribute decides link or text, and each key's value becomes a usable link
 * or nothing.
 *
 * Reuses the Wp_Options_Stub + WP function stub layer from SiteInfoTest.php. Negative controls: a text
 * attribute keeps its plain value (the old rule prefixed phone everywhere), and a link attribute never carries
 * the operator hint even when the operator is the viewer.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

require_once __DIR__ . '/SiteInfoTest.php';

if ( ! function_exists( 'is_admin' ) ) {
	function is_admin(): bool {
		return ! empty( $GLOBALS['sgs_test_is_admin'] );
	}
}
if ( ! function_exists( 'wp_is_serving_rest_request' ) ) {
	function wp_is_serving_rest_request(): bool {
		return false;
	}
}
if ( ! function_exists( 'admin_url' ) ) {
	function admin_url( string $path = '' ): string {
		return 'https://example.test/wp-admin/' . $path;
	}
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( string $key ): string {
		return (string) preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) );
	}
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( string $text ): string {
		return trim( strip_tags( $text ) );
	}
}

require_once __DIR__ . '/../../includes/class-sgs-site-info-binding.php';
require_once __DIR__ . '/../../includes/helpers-site-info-binding.php';

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Sgs_Site_Info_Binding as Binding;

final class SiteInfoBindingTest extends TestCase {

	protected function setUp(): void {
		Wp_Options_Stub::reset();
		$GLOBALS['sgs_test_is_admin'] = false;
		update_option(
			'sgs_site_info',
			array(
				'phone'   => '0121 729 8233',
				'email'   => 'hello@example.test',
				'address' => "12 High Street<br>Ward End\nBirmingham B8 1AA",
				'socials' => array(
					'whatsapp'  => '07700 900123',
					'instagram' => '@eyecare.birmingham',
					'facebook'  => 'facebook.com/eyecare',
					'google'    => 'https://share.google/abc',
				),
			)
		);
	}

	private function seed( array $patch ): void {
		update_option( 'sgs_site_info', array_replace_recursive( (array) get_option( 'sgs_site_info', array() ), $patch ) );
	}

	public function test_link_attributes_are_url_and_names_ending_url(): void {
		foreach ( array( 'url', 'linkUrl', 'imageUrl', 'logoUrl', 'drawingImageUrl' ) as $attr ) {
			$this->assertTrue( Binding::is_link_attribute( $attr ), $attr );
		}
		foreach ( array( '', 'label', 'text', 'linkTarget', 'rel', 'Url' ) as $attr ) {
			$this->assertFalse( Binding::is_link_attribute( $attr ), $attr );
		}
	}

	public function test_link_forms_per_key(): void {
		$this->assertSame( 'tel:01217298233', Binding::link_for_key( 'phone' ) );
		$this->assertSame( 'mailto:hello@example.test', Binding::link_for_key( 'email' ) );
		$this->assertSame( 'https://wa.me/07700900123', Binding::link_for_key( 'socials.whatsapp' ) );
		$this->assertSame( 'https://www.instagram.com/eyecare.birmingham', Binding::link_for_key( 'socials.instagram' ) );
		$this->assertSame( 'https://facebook.com/eyecare', Binding::link_for_key( 'socials.facebook' ) );
		$this->assertSame( 'https://share.google/abc', Binding::link_for_key( 'socials.google' ) );
		$this->assertSame(
			'https://www.google.com/maps/search/?api=1&query=' . rawurlencode( '12 High Street, Ward End, Birmingham B8 1AA' ),
			Binding::link_for_key( 'address' )
		);
	}

	public function test_maps_cid_wins_over_the_address(): void {
		$this->seed( array( 'maps_cid' => '1234567890' ) );
		$this->assertSame( 'https://maps.google.com/?cid=1234567890', Binding::link_for_key( 'address' ) );
	}

	public function test_whatsapp_accepts_wa_me_and_api_links(): void {
		$this->assertSame( 'https://wa.me/447700900123', Binding::prefix_url_for_key( 'socials.whatsapp', 'https://wa.me/+447700900123' ) );
		$this->assertSame( 'https://wa.me/447700900123', Binding::prefix_url_for_key( 'socials.whatsapp', 'api.whatsapp.com/send?phone=447700900123' ) );
		$this->assertSame( 'https://wa.me/447700900123', Binding::prefix_url_for_key( 'socials.whatsapp', '+44 7700 900123' ) );
	}

	public function test_values_that_make_no_link_give_nothing(): void {
		$this->assertSame( '', Binding::prefix_url_for_key( 'phone', 'call us' ) );
		$this->assertSame( '', Binding::prefix_url_for_key( 'phone', '+' ) );
		$this->assertSame( '', Binding::prefix_url_for_key( 'email', 'not an address' ) );
		$this->assertSame( '', Binding::prefix_url_for_key( 'socials.whatsapp', 'ask at the desk' ) );
		$this->assertSame( '', Binding::link_for_key( 'socials.tiktok' ), 'unset key' );
		$this->assertSame( '', Binding::link_for_key( '' ) );
	}

	public function test_hostile_values_never_produce_a_script_or_data_link(): void {
		$hostile = array( 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', "x\r\nLocation: evil", 'JaVaScRiPt:alert(1)' );
		foreach ( array( 'phone', 'email', 'socials.whatsapp', 'socials.facebook', 'socials.instagram' ) as $key ) {
			foreach ( $hostile as $value ) {
				$link = Binding::prefix_url_for_key( $key, $value );
				$this->assertDoesNotMatchRegularExpression( '/^\s*(javascript|data):/i', $link, "$key <- $value" );
				$this->assertStringNotContainsString( "\n", $link, "$key <- $value" );
			}
		}
	}

	public function test_address_markup_and_symbols_are_encoded(): void {
		$this->seed( array( 'address' => 'Unit 3 & 4 <script>x</script>#1? "Café" Rd' ) );
		$link  = Binding::link_for_key( 'address' );
		$query = substr( $link, strlen( 'https://www.google.com/maps/search/?api=1&query=' ) );
		$this->assertSame( 'Unit 3 & 4 x#1? "Café" Rd', rawurldecode( $query ) );
		$this->assertDoesNotMatchRegularExpression( '/[ <>"#?&]/', $query );
	}

	public function test_text_attribute_keeps_the_plain_value(): void {
		// Negative control for the old key-based rule, which rendered phone as "tel:…" inside text.
		$this->assertSame( '0121 729 8233', Binding::get_value( array( 'key' => 'phone' ), null, 'text' ) );
		$this->assertSame( 'hello@example.test', Binding::get_value( array( 'key' => 'email' ), null, 'content' ) );
	}

	public function test_link_attribute_gets_the_link(): void {
		$this->assertSame( 'tel:01217298233', Binding::get_value( array( 'key' => 'phone' ), null, 'linkUrl' ) );
	}

	public function test_empty_key_on_a_link_never_carries_the_hint_even_for_an_operator(): void {
		$GLOBALS['sgs_test_is_admin'] = true;
		Wp_Options_Stub::$user_can    = true;
		$this->assertSame( '', Binding::get_value( array( 'key' => 'socials.tiktok' ), null, 'linkUrl' ) );
		$this->assertStringContainsString( 'SGS Site Info', Binding::get_value( array( 'key' => 'socials.tiktok' ), null, 'text' ) );
	}

	private function block_bound_to( string $key, string $source = 'sgs/site-info' ): array {
		return array(
			'blockName' => 'sgs/icon',
			'attrs'     => array(
				'metadata' => array(
					'bindings' => array(
						'linkUrl' => array(
							'source' => $source,
							'args'   => array( 'key' => $key ),
						),
					),
				),
			),
		);
	}

	public function test_bound_key_is_read_from_the_block_metadata(): void {
		$this->assertSame( 'socials.whatsapp', sgs_bound_site_info_key( $this->block_bound_to( 'socials.whatsapp' ), 'linkUrl' ) );
		$this->assertNull( sgs_bound_site_info_key( $this->block_bound_to( 'phone' ), 'linkTarget' ), 'another attribute' );
		$this->assertNull( sgs_bound_site_info_key( $this->block_bound_to( 'phone', 'core/post-meta' ), 'linkUrl' ), 'another source' );
		$this->assertNull( sgs_bound_site_info_key( array( 'attrs' => array() ), 'linkUrl' ), 'not bound' );
	}

	public function test_bound_empty_is_true_only_for_a_bound_key_with_no_link(): void {
		$this->assertTrue( sgs_bound_site_info_is_empty( $this->block_bound_to( 'socials.tiktok' ), 'linkUrl' ) );
		$this->assertFalse( sgs_bound_site_info_is_empty( $this->block_bound_to( 'socials.whatsapp' ), 'linkUrl' ) );
		$this->assertFalse( sgs_bound_site_info_is_empty( array( 'attrs' => array() ), 'linkUrl' ), 'an unbound icon is never hidden by this rule' );
		$this->seed( array( 'phone' => 'ring the bell' ) );
		$this->assertTrue( sgs_bound_site_info_is_empty( $this->block_bound_to( 'phone' ), 'linkUrl' ), 'a phone with no digits makes no link' );
	}

	public function test_editor_data_needs_edit_posts(): void {
		$data = Binding::editor_site_info();
		$this->assertSame( Binding::EDITOR_KEYS, array_keys( $data ) );
		$this->assertTrue( $data['socials.whatsapp']['filled'] );
		$this->assertSame( 'https://wa.me/07700900123', $data['socials.whatsapp']['link'] );
		$this->assertFalse( $data['socials.tiktok']['filled'] );
		$this->assertSame( '0121 729 8233', $data['phone']['value'] );
		Wp_Options_Stub::$user_can = false;
		$this->assertSame( array(), Binding::editor_site_info() );
	}

	public function test_visitor_never_sees_the_hint(): void {
		$GLOBALS['sgs_test_is_admin'] = false;
		$this->assertSame( '', Binding::get_value( array( 'key' => 'socials.tiktok' ), null, 'text' ) );
	}
}
