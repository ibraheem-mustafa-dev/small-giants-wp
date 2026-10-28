<?php
/**
 * Gift card amounts and purchase fields (Spec 27, FR-27-GC1 and FR-27-GC4).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use SGS\Blocks\Gift_Card\Gift_Card_Amounts;
use SGS\Blocks\Gift_Card\Gift_Card_Purchase_Fields as F;
use SGS\Blocks\Gift_Card\Gift_Card_Settings;
use SGS\Blocks\Tests\Support\Gift_Card_Test_Case;

require_once __DIR__ . '/support/Gift_Card_Test_Case.php';

if ( ! function_exists( 'sanitize_email' ) ) {
	// phpcs:ignore
	function sanitize_email( $email ) {
		$email = trim( (string) $email );
		return false !== filter_var( $email, FILTER_VALIDATE_EMAIL ) ? $email : '';
	}
}

#[Group( 'sgs_gift_card' )]
final class GiftCardPurchaseTest extends Gift_Card_Test_Case {

	private const TODAY = '2026-10-28';

	/** @return array<string,mixed> */
	private function mamas_config(): array {
		return Gift_Card_Amounts::config( array( 1500, 2500, 4000 ), false, 0, 0 );
	}

	/** @return array<string,mixed> */
	private function good_input( array $override = array() ): array {
		return array_merge(
			array(
				F::F_AMOUNT    => '2500',
				F::F_RECIPIENT => 'Aisha',
				F::F_EMAIL     => 'aisha@example.test',
				F::F_SENDER    => 'Bean',
				F::F_MESSAGE   => 'Congratulations',
				F::F_SEND_ON   => '',
			),
			$override
		);
	}

	public function test_the_admin_list_parses_to_sorted_unique_pence(): void {
		$this->assertSame( array( 1500, 2500, 4000 ), Gift_Card_Amounts::parse_list( '40, 15; £25, 15, nonsense, -3, 0' ) );
		$this->assertSame( array(), Gift_Card_Amounts::parse_list( '' ) );
		$this->assertCount( Gift_Card_Amounts::MAX_FIXED, Gift_Card_Amounts::parse_list( implode( ',', range( 1, 60 ) ) ) );
	}

	public function test_only_a_configured_amount_resolves_and_a_posted_price_is_ignored(): void {
		$config = $this->mamas_config();
		$this->assertSame( 1500, Gift_Card_Amounts::resolve( $config, '1500' ) );
		$this->assertSame( 4000, Gift_Card_Amounts::resolve( $config, '4000' ) );
		foreach ( array( '1', '2000', '-1500', '15.00', '1500abc', '', '99999999999', 'custom' ) as $bad ) {
			$this->assertNull( Gift_Card_Amounts::resolve( $config, $bad, '20' ), $bad );
		}
	}

	public function test_the_price_comes_from_the_amount_choice_not_from_any_posted_price(): void {
		$result = F::validate(
			$this->good_input(
				array(
					'price'               => '0.01',
					'_price'              => '0.01',
					'sgs_gift_card_price' => '1',
				)
			),
			$this->mamas_config(),
			new Gift_Card_Settings(),
			self::TODAY
		);
		$this->assertTrue( $result['ok'] );
		$this->assertSame( 2500, $result['data']['amount_pence'] );
		$this->assertArrayNotHasKey( 'price', $result['data'] );
	}

	public function test_a_custom_amount_is_off_by_default_and_range_checked_when_on(): void {
		$off = $this->mamas_config();
		$this->assertNull( Gift_Card_Amounts::resolve( $off, 'custom', '20' ) );

		$on = Gift_Card_Amounts::config( array( 2500 ), true, 1000, 10000 );
		$this->assertSame( 2000, Gift_Card_Amounts::resolve( $on, 'custom', '20' ) );
		$this->assertSame( 1000, Gift_Card_Amounts::resolve( $on, 'custom', '10' ) );
		$this->assertSame( 10000, Gift_Card_Amounts::resolve( $on, 'custom', '100.00' ) );
		foreach ( array( '9.99', '100.01', '', 'abc', '-20', '20.555' ) as $bad ) {
			$this->assertNull( Gift_Card_Amounts::resolve( $on, 'custom', $bad ), $bad );
		}
	}

	public function test_a_complete_valid_submission_passes(): void {
		$result = F::validate( $this->good_input(), $this->mamas_config(), new Gift_Card_Settings(), self::TODAY );
		$this->assertTrue( $result['ok'], json_encode( $result['errors'] ) );
		$this->assertSame( 'aisha@example.test', $result['data']['recipient_email'] );
		$this->assertNull( $result['data']['send_on'] );
	}

	public function test_each_missing_or_bad_field_is_refused_with_its_own_error(): void {
		$cases = array(
			F::F_AMOUNT    => array( F::F_AMOUNT => '2600' ),
			F::F_RECIPIENT => array( F::F_RECIPIENT => '  ' ),
			F::F_EMAIL     => array( F::F_EMAIL => 'not-an-email' ),
			F::F_SENDER    => array( F::F_SENDER => '' ),
			F::F_MESSAGE   => array( F::F_MESSAGE => str_repeat( 'x', 301 ) ),
			F::F_SEND_ON   => array( F::F_SEND_ON => '2026-10-27' ),
		);
		foreach ( $cases as $field => $override ) {
			$result = F::validate( $this->good_input( $override ), $this->mamas_config(), new Gift_Card_Settings(), self::TODAY );
			$this->assertFalse( $result['ok'], $field );
			$this->assertArrayHasKey( $field, $result['errors'], $field );
			$this->assertCount( 1, $result['errors'], $field . ' should be the only error' );
		}
	}

	public function test_send_date_rules(): void {
		$settings = new Gift_Card_Settings();
		$run      = fn( string $date ) => F::validate( $this->good_input( array( F::F_SEND_ON => $date ) ), $this->mamas_config(), $settings, self::TODAY );

		$this->assertTrue( $run( self::TODAY )['ok'], 'Today is allowed.' );
		$this->assertSame( '2026-12-25', $run( '2026-12-25' )['data']['send_on'] );
		$this->assertTrue( $run( '2027-10-28' )['ok'], '365 days ahead is the last day.' );
		$this->assertFalse( $run( '2027-10-29' )['ok'] );
		$this->assertFalse( $run( '2026-02-30' )['ok'], 'Not a real date.' );
		$this->assertFalse( $run( '28/10/2026' )['ok'] );
		$this->assertFalse( $run( '2026-10-27' )['ok'], 'Yesterday.' );
	}

	public function test_markup_and_control_characters_are_stripped_from_text(): void {
		$result = F::validate(
			$this->good_input(
				array(
					F::F_RECIPIENT => "<b>Ai</b>sha\x00\r\n",
					F::F_MESSAGE   => "<script>alert(1)</script>Line one\nLine two\x07",
				)
			),
			$this->mamas_config(),
			new Gift_Card_Settings(),
			self::TODAY
		);
		$this->assertTrue( $result['ok'] );
		$this->assertSame( 'Aisha', $result['data']['recipient_name'] );
		$this->assertStringNotContainsString( '<', $result['data']['message'] );
		$this->assertStringContainsString( "Line one\nLine two", $result['data']['message'] );
		$this->assertStringNotContainsString( "\x07", $result['data']['message'] );
	}

	public function test_the_message_limit_follows_the_setting(): void {
		$short = new Gift_Card_Settings( array( 'message_max_chars' => 10 ) );
		$this->assertFalse( F::validate( $this->good_input( array( F::F_MESSAGE => str_repeat( 'x', 11 ) ) ), $this->mamas_config(), $short, self::TODAY )['ok'] );
		$this->assertTrue( F::validate( $this->good_input( array( F::F_MESSAGE => str_repeat( 'x', 10 ) ) ), $this->mamas_config(), $short, self::TODAY )['ok'] );
	}

	public function test_every_setting_defaults_to_beans_answers(): void {
		$s = new Gift_Card_Settings();
		$this->assertSame( 'email', $s->get( 'delivery_method' ) );
		$this->assertTrue( $s->partial_use() );
		$this->assertSame( 24, $s->expiry_months() );
		$this->assertSame( 28, $s->refund_days() );
		$this->assertTrue( $s->is_multi_purpose() );
		$this->assertTrue( $s->get( 'allow_with_coupons' ) );
		$this->assertTrue( $s->get( 'allow_on_delivery' ) );

		$other = new Gift_Card_Settings(
			array(
				'expiry_months'   => '12',
				'vat_mode'        => 'single_purpose',
				'partial_use'     => '0',
				'delivery_method' => 'post',
				'unknown'         => 'x',
			)
		);
		$this->assertSame( 12, $other->expiry_months() );
		$this->assertFalse( $other->is_multi_purpose() );
		$this->assertFalse( $other->partial_use() );
		$this->assertSame( 'email', $other->get( 'delivery_method' ), 'Only email exists today.' );
		$this->assertNull( $other->get( 'unknown' ) );
	}
}
