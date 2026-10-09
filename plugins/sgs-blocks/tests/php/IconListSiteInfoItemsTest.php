<?php
/**
 * sgs/icon-list: an item can take its text and link from Site Info (`siteInfoSource` phone | email | address | hours,
 * `siteInfoLink`), a blank Site Info value hides the item, and the shown text is escaped.
 *
 * Run with: vendor/bin/phpunit --filter IconListSiteInfoItemsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class IconListSiteInfoItemsTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const INFO = array(
		'phone'         => '0121 729 8233',
		'email'         => 'hello@example.test',
		'address'       => '644 Washwood Heath Rd<br>Birmingham B8 2HQ',
		'maps_cid'      => '1234567890',
		'opening_hours' => array(
			'mon' => '9.30-17.30',
			'tue' => '9.30-17.30',
			'wed' => '9.30-17.30',
			'thu' => '9.30-17.30',
			'fri' => '9.30-17.30',
			'sat' => '9.30-17.30',
			'sun' => '',
		),
		'socials'       => array( 'google' => 'https://g.page/eye-care' ),
	);

	protected function tearDown(): void {
		putenv( 'SGS_QA_OPTIONS' );
	}

	/**
	 * @param array<int,array<string,mixed>> $items Items.
	 * @param array<string,mixed>            $info  Site Info overrides merged over INFO.
	 */
	private function list( array $items, array $info = array() ): string {
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => array_merge( self::INFO, $info ) ) ) );
		return $this->render_block( 'sgs/icon-list', array( 'items' => $items ) )['html'];
	}

	public function test_typed_item_is_unchanged_and_ignores_site_info(): void {
		$html = $this->list( array( array( 'text' => 'About Eye Care', 'url' => 'https://example.test/about/' ) ) );
		$this->assertStringContainsString( 'href="https://example.test/about/"', $html );
		$this->assertStringContainsString( 'About Eye Care', $html );
	}

	public function test_phone_shows_the_number_and_links_tel(): void {
		$html = $this->list( array( array( 'text' => 'ignored typed text', 'siteInfoSource' => 'phone' ) ) );
		$this->assertStringContainsString( 'href="tel:01217298233"', $html );
		$this->assertStringContainsString( '>0121 729 8233</a>', $html );
		$this->assertStringNotContainsString( 'ignored typed text', $html, 'the typed text is not used when the item reads Site Info' );
	}

	public function test_email_shows_the_address_and_links_mailto(): void {
		$html = $this->list( array( array( 'siteInfoSource' => 'email' ) ) );
		$this->assertStringContainsString( 'href="mailto:', $html );
		$this->assertStringContainsString( 'hello@example.test', $html );
	}

	public function test_address_links_to_the_maps_link_only_when_asked(): void {
		$linked = $this->list( array( array( 'siteInfoSource' => 'address', 'siteInfoLink' => true ) ) );
		$this->assertStringContainsString( 'href="https://maps.google.com/?cid=1234567890"', $linked );
		$this->assertStringContainsString( '644 Washwood Heath Rd<br>Birmingham B8 2HQ', $linked );

		$plain = $this->list( array( array( 'siteInfoSource' => 'address' ) ) );
		$this->assertStringContainsString( 'Birmingham B8 2HQ', $plain, 'positive control: the address rendered' );
		$this->assertStringNotContainsString( '<a ', $plain );
	}

	public function test_hours_show_the_condensed_text_and_link_the_google_profile_or_the_typed_url(): void {
		$html = $this->list( array( array( 'siteInfoSource' => 'hours', 'siteInfoLink' => true ) ) );
		$this->assertStringContainsString( "Mon\u{2013}Sat 9.30-17.30", $html );
		$this->assertStringNotContainsString( 'Sun', $html, 'a closed day is not listed' );
		$this->assertStringContainsString( 'href="https://g.page/eye-care"', $html );

		$typed = $this->list( array( array( 'siteInfoSource' => 'hours', 'siteInfoLink' => true, 'url' => 'https://example.test/visit/' ) ) );
		$this->assertStringContainsString( 'href="https://example.test/visit/"', $typed );
		$this->assertStringNotContainsString( 'g.page', $typed );

		$unlinked = $this->list( array( array( 'siteInfoSource' => 'hours' ) ) );
		$this->assertStringContainsString( '9.30-17.30', $unlinked );
		$this->assertStringNotContainsString( '<a ', $unlinked );
	}

	public function test_a_blank_site_info_value_hides_the_item(): void {
		$items = array(
			array( 'text' => 'About Eye Care', 'url' => 'https://example.test/about/' ),
			array( 'siteInfoSource' => 'phone' ),
			array( 'siteInfoSource' => 'hours' ),
		);
		$html  = $this->list( $items, array( 'phone' => '', 'opening_hours' => array() ) );
		$this->assertSame( 1, substr_count( $html, '<li ' ), 'only the typed item is left' );
		$this->assertStringContainsString( 'About Eye Care', $html );
	}

	public function test_site_info_text_is_escaped(): void {
		$html = $this->list( array( array( 'siteInfoSource' => 'phone' ) ), array( 'phone' => '<script>alert(1)</script>' ) );
		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( '&lt;script&gt;', $html );
	}

	public function test_negative_control_an_unknown_source_falls_back_to_the_typed_item(): void {
		$html = $this->list( array( array( 'text' => 'Typed words', 'siteInfoSource' => 'nonsense' ) ) );
		$this->assertStringContainsString( 'Typed words', $html );
	}

	public function test_hidden_items_keep_the_per_item_colour_rules_aligned(): void {
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => array_merge( self::INFO, array( 'phone' => '' ) ) ) ) );
		$out = $this->render_block(
			'sgs/icon-list',
			array(
				'items' => array(
					array( 'siteInfoSource' => 'phone' ),
					array( 'text' => 'Second', 'iconColour' => '#112233' ),
				),
			)
		);
		$this->assertStringContainsString( '.sgs-icon-list__item:nth-child(1) .sgs-icon-list__icon{color:#112233', $out['css'], 'the surviving item is the first li, so its rule targets nth-child(1)' );
	}
}
