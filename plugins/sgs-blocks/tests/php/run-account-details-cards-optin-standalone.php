<?php
/**
 * Standalone test: the account details form's two-card layout is opt-in (`accountDetailsCards`, default off).
 *
 * Off, the form's markup is exactly WooCommerce's (what it was before the two-card change) and the form's column and gap
 * CSS targets the single form; on, the form becomes two cards and the CSS targets each card.
 *
 * The off-state CSS is compared with a string captured once from the pre-change code
 * (`git show 540792a84^:plugins/sgs-blocks/includes/account/helpers-account-look-css.php`, columns "2", gap 24px).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-details-cards-optin-standalone.php
 * Exit 0 all pass, 1 any failure.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = dirname( __DIR__, 2 );
define( 'ABSPATH', $base . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );
function is_user_logged_in() { return true; }
require $base . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'add_filter' ) ) { function add_filter() {} }
if ( ! function_exists( 'add_action' ) ) { function add_action() {} }
if ( ! function_exists( 'remove_filter' ) ) { function remove_filter() {} }
if ( ! function_exists( 'get_option' ) ) { function get_option( $k, $d = false ) { return $d; } }

require $base . '/includes/account/class-account-strings.php';
require $base . '/includes/account/helpers-account-edit-account.php';
require $base . '/includes/account/helpers-account-look-css.php';

$failures = 0;
function ok( bool $cond, string $label, string $detail = '' ): void {
	global $failures;
	if ( ! $cond ) { ++$failures; }
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . ( ! $cond && '' !== $detail ? "  => {$detail}" : '' ) . "\n";
}

$form = '<div class="woocommerce-MyAccount-content"><form class="woocommerce-EditAccountForm edit-account" action="" method="post">'
	. '<p><input name="account_first_name" id="account_first_name" /></p>'
	. '<p><input name="account_email" id="account_email" /></p>'
	. '<p class="sgs-account__marketing-opt-in"><input type="checkbox" name="sgs_marketing_opt_in" /></p>'
	. '<fieldset><legend>Password change</legend><p><input type="password" name="password_1" id="password_1" /></p></fieldset>'
	. '<div class="clear"></div>'
	. '<p><input type="hidden" id="save-account-details-nonce" name="save-account-details-nonce" value="n" />'
	. '<button type="submit" class="woocommerce-Button button" name="save_account_details" value="Save changes">Save changes</button>'
	. '<input type="hidden" name="action" value="save_account_details" /></p>'
	. '</form></div>';
$expected_off = str_replace( '<div class="woocommerce-MyAccount-content">', '<div class="woocommerce-MyAccount-content sgs-account__tab-content">', $form );

$off_default = sgs_account_edit_account_markup( $form, array() );
$off_false   = sgs_account_edit_account_markup( $form, array( 'accountDetailsCards' => false ) );
$on          = sgs_account_edit_account_markup( $form, array( 'accountDetailsCards' => true ) );

ok( $expected_off === $off_default, 'default (attribute unset): the form markup is WooCommerce\'s, as before the two-card change' );
ok( $expected_off === $off_false, 'accountDetailsCards false: the same markup' );
ok( false === strpos( $off_default, 'sgs-account__edit-card' ) && false === strpos( $off_default, 'sgs-account__card-actions' ) && false === strpos( $off_default, 'sgs-account__save-password' ), 'off: no card wrapper, card actions or password button class' );
ok( 1 === substr_count( $off_default, 'name="save_account_details"' ), 'off: one Save button' );
ok( 2 === substr_count( $on, 'name="save_account_details"' ) && false !== strpos( $on, 'sgs-account__edit-card--details' ) && false !== strpos( $on, 'sgs-account__edit-card--password' ), 'on: two cards, one button each' );

// Column and gap CSS.
$attrs   = array( 'accountFormColumns' => '2', 'accountFormGap' => array( 'desktop' => '24px' ) );
$css_off = sgs_account_details_look_css( $attrs, '.r' );
$css_on  = sgs_account_details_look_css( $attrs + array( 'accountDetailsCards' => true ), '.r' );
$OLD_OFF = '.r .woocommerce-EditAccountForm{display:grid;grid-template-columns:minmax(0,1fr);}.r .woocommerce-EditAccountForm > p{float:none;width:auto;margin:0;}.r .woocommerce-EditAccountForm > fieldset,.r .woocommerce-EditAccountForm > .clear,.r .woocommerce-EditAccountForm > p:has(> button[type="submit"]){grid-column:1/-1;}@container sgs-account (min-width:640px){.r .woocommerce-EditAccountForm{grid-template-columns:repeat(2,minmax(0,1fr));}}.r .woocommerce-EditAccountForm{gap:24px;}';
ok( $OLD_OFF === $css_off, 'off: the column and gap CSS equals the pre-change CSS', $css_off );
ok( false === strpos( $css_off, 'sgs-account__edit-card' ), 'off: the CSS never targets the cards' );
ok( false !== strpos( $css_on, '.r .woocommerce-EditAccountForm .sgs-account__edit-card' ) && false !== strpos( $css_on, 'sgs-account__marketing-opt-in' ), 'on: the CSS targets each card' );

echo $failures ? "\n{$failures} FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
