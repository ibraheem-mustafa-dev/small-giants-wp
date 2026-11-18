<?php
/**
 * Gift card purchase form: whole-pound tiles, the amount-following button and the default amount
 * (Spec 27, FR-27-GC4).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;
use SGS\Blocks\Gift_Card\Gift_Card_Amounts;
use SGS\Blocks\Gift_Card\Gift_Card_Form_View;
use SGS\Blocks\Gift_Card\Gift_Card_Money;

require_once __DIR__ . '/support/gift-card-domain.php';
require_once dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-form-view.php';

if ( ! function_exists( '__' ) ) {
	// phpcs:ignore
	function __( $text, $domain = 'default' ) {
		return $text;
	}
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	// phpcs:ignore
	function wp_strip_all_tags( $text ) {
		return trim( strip_tags( (string) $text ) );
	}
}

#[Group( 'sgs_gift_card' )]
final class GiftCardFormTest extends TestCase {

	public function test_whole_pound_amount_drops_the_decimals(): void {
		$this->assertSame( '£15', Gift_Card_Money::format_whole( 1500, '£', 'left' ) );
		$this->assertSame( '£100', Gift_Card_Money::format_whole( 10000, '£', 'left' ) );
	}

	public function test_fractional_amount_keeps_its_pence(): void {
		$this->assertSame( '£12.50', Gift_Card_Money::format_whole( 1250, '£', 'left' ) );
		$this->assertSame( '£0.05', Gift_Card_Money::format_whole( 5, '£', 'left' ) );
		$this->assertSame( '£15.01', Gift_Card_Money::format_whole( 1501, '£', 'left' ) );
	}

	public function test_zero_and_negative_amounts(): void {
		$this->assertSame( '£0', Gift_Card_Money::format_whole( 0, '£', 'left' ) );
		$this->assertSame( '-£15', Gift_Card_Money::format_whole( -1500, '£', 'left' ) );
	}

	public function test_symbol_position_follows_the_shop(): void {
		$this->assertSame( '15€', Gift_Card_Money::format_whole( 1500, '€', 'right' ) );
		$this->assertSame( '12.50 €', Gift_Card_Money::format_whole( 1250, '€', 'right_space' ) );
		$this->assertSame( '$ 15', Gift_Card_Money::format_whole( 1500, '$', 'left_space' ) );
	}

	public function test_default_format_is_unchanged(): void {
		$this->assertSame( '£15.00', Gift_Card_Money::format( 1500 ) );
		$this->assertSame( '£15.00', Gift_Card_Money::format_price( 1500, '£', 'left' ) );
		$this->assertSame( '25.00 €', Gift_Card_Money::format_price( 2500, '€', 'right_space' ) );
	}

	public function test_button_label_without_a_placeholder_is_left_alone(): void {
		$this->assertSame( 'Add gift card to basket', Gift_Card_Form_View::button_label( Gift_Card_Form_View::default_button_label(), '£25.00' ) );
		$this->assertSame( 'Add gift card to basket', Gift_Card_Form_View::button_label( 'Add gift card to basket', null ) );
	}

	public function test_button_label_prints_the_chosen_amount(): void {
		$this->assertSame( 'Add to basket · £25.00', Gift_Card_Form_View::button_label( 'Add to basket · {amount}', '£25.00' ) );
		$this->assertSame( 'Add £12.50 to basket', Gift_Card_Form_View::button_label( 'Add {amount} to basket', '£12.50' ) );
	}

	public function test_button_label_with_no_amount_drops_the_placeholder_and_its_separator(): void {
		$this->assertSame( 'Add to basket', Gift_Card_Form_View::button_label( 'Add to basket · {amount}', null ) );
		$this->assertSame( 'Add to basket', Gift_Card_Form_View::button_label( 'Add to basket - {amount}', null ) );
		$this->assertSame( 'Add to basket', Gift_Card_Form_View::button_label( 'Add to basket: {amount}', null ) );
		$this->assertSame( 'Add to basket', Gift_Card_Form_View::button_label( 'Add {amount} to basket', null ) );
		$this->assertSame( 'Buy now', Gift_Card_Form_View::button_label( '{amount} · Buy now', null ) );
	}

	public function test_button_label_is_cleaned_on_save(): void {
		$this->assertSame( 'Add to basket · {amount}', Gift_Card_Amounts::sanitise_button_label( "  <b>Add to</b>\n basket · {amount} " ) );
		$this->assertSame( 80, strlen( Gift_Card_Amounts::sanitise_button_label( str_repeat( 'a', 200 ) ) ) );
	}

	public function test_default_amount_that_is_a_preset_is_selected(): void {
		$this->assertSame( 2500, Gift_Card_Amounts::initial_amount( array( 1500, 2500, 4000 ), 2500 ) );
	}

	public function test_default_amount_that_is_not_a_preset_falls_back_to_the_first(): void {
		$this->assertSame( 1500, Gift_Card_Amounts::initial_amount( array( 1500, 2500, 4000 ), 3000 ) );
		$this->assertSame( 1500, Gift_Card_Amounts::initial_amount( array( 1500, 2500, 4000 ), 0 ) );
		$this->assertSame( 0, Gift_Card_Amounts::initial_amount( array(), 2500 ) );
	}
}
