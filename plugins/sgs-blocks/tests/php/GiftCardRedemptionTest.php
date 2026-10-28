<?php
/**
 * Gift card redemption as a payment line, combining rules and the gift-card-for-gift-card
 * refusal (Spec 27, FR-27-GC5 and FR-27-GC10).
 *
 * The scenarios run in a child process (tests/php/support/gift-card-redemption-harness.php)
 * with fake WooCommerce cart and session objects, so the stubs stay out of this process.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group( 'sgs_gift_card' )]
final class GiftCardRedemptionTest extends TestCase {

	/** @var array<string,mixed> */
	private static array $r = array();

	public static function setUpBeforeClass(): void {
		$script = __DIR__ . '/support/gift-card-redemption-harness.php';
		$out    = array();
		$code   = 0;
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1', $out, $code );
		$json = json_decode( implode( "\n", $out ), true );
		if ( 0 !== $code || ! is_array( $json ) ) {
			self::fail( 'Harness failed: ' . implode( "\n", $out ) );
		}
		self::$r = $json;
	}

	public function test_a_gift_card_cannot_pay_for_a_gift_card(): void {
		$this->assertSame( 'cart_has_gift_card', self::$r['apply_to_gift_cart'] );
		$this->assertSame( array(), self::$r['session_after_refused'], 'Nothing is applied.' );
		$this->assertSame( array(), self::$r['gift_card_in_cart_no_fee'], 'Even a card already applied pays nothing once a gift card is in the cart.' );
	}

	public function test_the_same_code_applies_to_an_ordinary_cart(): void {
		$this->assertSame( 'APPLIED', self::$r['apply_to_normal_cart'], 'Control for the refusal above.' );
		$this->assertCount( 1, self::$r['session_after_apply'] );
		$this->assertSame( array(), self::$r['session_after_remove'] );
	}

	public function test_a_bad_code_gets_the_uniform_message(): void {
		$this->assertSame( 'That gift card code is not valid or cannot be used.', self::$r['apply_bad_code'] );
	}

	public function test_redemption_is_a_non_taxable_negative_fee_that_covers_goods_and_delivery(): void {
		$fee = self::$r['mpv_covers_goods_and_delivery'];
		$this->assertCount( 1, $fee );
		$this->assertSame( -23.99, $fee[0]['amount'], '20.00 goods + 3.99 delivery.' );
		$this->assertFalse( $fee[0]['taxable'], 'Multi-purpose: a payment, so the VAT base is untouched.' );
		$this->assertMatchesRegularExpression( '/^sgs_gift_card_\d+$/', $fee[0]['id'] );
		$this->assertStringStartsWith( 'Gift card ending ', $fee[0]['name'] );
	}

	public function test_the_payable_amount_includes_tax_so_the_fee_is_after_tax(): void {
		$this->assertEqualsWithDelta( -24.0, self::$r['mpv_payable_includes_tax'][0]['amount'], 0.001, '20.00 + 4.00 VAT.' );
	}

	public function test_a_card_pays_no_more_than_its_balance_and_cards_share_the_rest(): void {
		$this->assertEqualsWithDelta( -10.0, self::$r['mpv_capped_at_balance'][0]['amount'], 0.001 );
		$two = self::$r['two_cards_in_order'];
		$this->assertCount( 2, $two );
		$this->assertSame( -23.99, round( $two[0]['amount'] + $two[1]['amount'], 2 ) );
	}

	public function test_a_spent_card_adds_no_fee(): void {
		$this->assertSame( array(), self::$r['spent_card_no_fee'] );
	}

	public function test_delivery_charges_can_be_excluded_by_setting(): void {
		$this->assertEqualsWithDelta( -20.0, self::$r['no_delivery_when_off'][0]['amount'], 0.001 );
		$this->assertEqualsWithDelta( -23.99, self::$r['mpv_covers_goods_and_delivery'][0]['amount'], 0.001, 'Control: delivery is paid by default.' );
	}

	public function test_coupons_are_allowed_by_default_and_blockable_by_setting(): void {
		$this->assertEqualsWithDelta( -23.99, self::$r['coupon_allowed_by_default'][0]['amount'], 0.001 );
		$this->assertSame( array(), self::$r['coupon_blocks_when_off'] );
		$this->assertEqualsWithDelta( -23.99, self::$r['no_coupon_ok_when_off'][0]['amount'], 0.001, 'Control: with the rule on, a cart without a coupon still pays.' );
	}

	public function test_single_purpose_mode_uses_a_taxable_fee_sized_to_the_gross_amount(): void {
		$fee = self::$r['spv_fee_is_net_and_taxable'][0];
		$this->assertTrue( $fee['taxable'] );
		$this->assertEqualsWithDelta( -20.0, $fee['amount'], 0.001, '24.00 gross at 20% VAT is 20.00 net; WooCommerce adds the 4.00 tax back.' );
	}
}
