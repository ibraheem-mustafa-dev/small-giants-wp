<?php
/**
 * sgs/business-info: addressLink links the address to Google Maps (Maps CID, else the Google Business Profile
 * link, else a Maps search), linkUnderline reaches its links, and hoursRowJustify keeps the hours beside the day.
 *
 * Run with: vendor/bin/phpunit --filter BusinessInfoLinksAndHoursTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class BusinessInfoLinksAndHoursTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function site_info( array $info ): void {
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => $info ) ) );
	}

	protected function tearDown(): void {
		putenv( 'SGS_QA_OPTIONS' );
	}

	public function test_address_link_prefers_the_maps_cid(): void {
		$this->site_info( array( 'address' => '644 Washwood Heath Rd<br>Birmingham B8 2HQ', 'maps_cid' => '1234567890', 'socials' => array( 'google' => 'https://g.page/eye-care' ) ) );
		$html = $this->render_block( 'sgs/business-info', array( 'displayType' => 'address', 'addressLink' => true ) )['html'];

		$this->assertMatchesRegularExpression( '#<address class="sgs-business-info sgs-business-address"><a href="https://maps\.google\.com/\?cid=1234567890" class="sgs-business-info__link" rel="noopener">#', $html );
		$this->assertStringContainsString( 'Birmingham B8 2HQ', $html );
	}

	public function test_address_link_prefers_the_maps_link_field_and_never_uses_the_profile_or_review_link(): void {
		$this->site_info( array( 'address' => '644 Washwood Heath Rd<br>Birmingham', 'maps_url' => 'https://maps.app.goo.gl/abc', 'maps_cid' => '1234567890', 'socials' => array( 'google' => 'https://g.page/r/review' ) ) );
		$html = $this->render_block( 'sgs/business-info', array( 'displayType' => 'address', 'addressLink' => true ) )['html'];
		$this->assertStringContainsString( 'href="https://maps.app.goo.gl/abc"', $html );

		// Negative control: without a Maps link or CID the review link in socials.google is still not used.
		$this->site_info( array( 'address' => '644 Washwood Heath Rd<br>Birmingham', 'socials' => array( 'google' => 'https://g.page/r/review' ) ) );
		$html = $this->render_block( 'sgs/business-info', array( 'displayType' => 'address', 'addressLink' => true ) )['html'];
		$this->assertStringNotContainsString( 'g.page/r/review', $html );
		$this->assertMatchesRegularExpression( '#href="https://www\.google\.com/maps/search/\?api=1(&|&\#038;)query=644%20Washwood%20Heath%20Rd%2C%20Birmingham"#', $html );
	}

	public function test_address_without_the_toggle_is_not_a_link(): void {
		$this->site_info( array( 'address' => '644 Washwood Heath Rd', 'maps_cid' => '1234567890' ) );
		$html = $this->render_block( 'sgs/business-info', array( 'displayType' => 'address' ) )['html'];

		$this->assertStringContainsString( '644 Washwood Heath Rd', $html, 'positive control: the address rendered' );
		$this->assertStringNotContainsString( '<a ', $html );
	}

	public function test_link_underline_is_drawn_on_the_text_inside_the_phone_link(): void {
		$this->site_info( array( 'phone' => '0121 000 0000' ) );

		// The email link takes the same code path; the harness has no is_email(), so only the phone renders here.
		foreach ( array( 'phone' => '0121 000 0000' ) as $type => $value ) {
			$out = $this->render_block( 'sgs/business-info', array( 'displayType' => $type, 'linkUnderline' => 'sweep' ) );

			$this->assertStringContainsString( 'class="sgs-business-info__link"', $out['html'], $type . ' rendered as a link' );
			$this->assertStringContainsString( '<span class="sgs-business-info__text">' . $value . '</span>', $out['html'], $type . ' text sits in the inline span' );
			// The link is a 44px-tall flex box: the line is drawn on the inline text, so it sits under the words, not under the tap padding.
			// The doubled class outranks style.css's `.sgs-business-info__link:hover` and the theme's focus underline.
			$this->assertMatchesRegularExpression( '/(\.sgs-biz-[0-9a-f]{8})\1 a\{text-decoration:none;\}\1\1 a \.sgs-business-info__text\{background-image:linear-gradient\(currentColor,currentColor\);background-repeat:no-repeat;background-origin:content-box;/', $out['css'], $type );
			$this->assertDoesNotMatchRegularExpression( '/\} a\{[^}]*background-image/', $out['css'], $type . ': the link box itself carries no line' );
		}
	}

	public function test_a_linked_address_draws_the_sweep_on_its_inline_text_so_every_line_is_underlined(): void {
		$this->site_info( array( 'address' => '644 Washwood Heath Rd<br>Birmingham B8 2HQ', 'maps_cid' => '1234567890' ) );
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'address', 'addressLink' => true, 'linkUnderline' => 'sweep' ) );

		$this->assertStringContainsString( '<span class="sgs-business-info__text">644 Washwood Heath Rd<br>Birmingham B8 2HQ</span>', $out['html'] );
		// The line sits on the inline span, not on the link's flex box.
		$this->assertMatchesRegularExpression( '/(\.sgs-biz-[0-9a-f]{8})\1 a \.sgs-business-info__text\{background-image:linear-gradient/', $out['css'] );
		$this->assertMatchesRegularExpression( '/(\.sgs-biz-[0-9a-f]{8})\1 a:hover \.sgs-business-info__text/', $out['css'], 'hover on the link paints the span' );
		$this->assertMatchesRegularExpression( '/(\.sgs-biz-[0-9a-f]{8})\1 a:focus-visible \.sgs-business-info__text/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/(\.sgs-biz-[0-9a-f]{8})\1 a\{[^}]*background-image/', $out['css'], 'negative control: the link box carries no line' );
	}

	public function test_the_attribution_credit_keeps_its_own_sweep(): void {
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'attribution', 'linkUnderline' => 'sweep' ) );

		$this->assertStringContainsString( 'sgs-business-attribution', $out['html'], 'positive control: the credit rendered' );
		$this->assertStringNotContainsString( 'linear-gradient(currentColor', $out['css'] );
	}

	public function test_hours_beside_the_day_and_the_default_end_of_row(): void {
		$this->site_info( array( 'opening_hours' => array( 'mon' => '9-5' ) ) );
		$beside = $this->render_block( 'sgs/business-info', array( 'displayType' => 'hours', 'hoursRowJustify' => 'flex-start' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-biz-[0-9a-f]{8} \.sgs-business-hours__row\{justify-content:flex-start;\}/', $beside['css'] );

		$default = $this->render_block( 'sgs/business-info', array( 'displayType' => 'hours' ) );
		$this->assertStringContainsString( 'sgs-business-hours__row', $default['html'], 'positive control: the hours rows rendered' );
		$this->assertStringNotContainsString( 'justify-content:flex-start', $default['css'] );
	}
}
