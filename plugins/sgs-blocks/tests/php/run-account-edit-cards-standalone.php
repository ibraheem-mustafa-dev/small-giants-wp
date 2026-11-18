<?php
/**
 * Standalone test: the account details form becomes two cards inside one form, each ending in its own submit button
 * (includes/account/helpers-account-edit-account.php::sgs_account_edit_account_cards).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-edit-cards-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
function __( $t, $d = null ) { return $t; }
function esc_html( $t ) { return htmlspecialchars( (string) $t ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t ); }

$root = dirname( __DIR__, 2 ) . '/includes/account';
require $root . '/class-account-strings.php';
require $root . '/helpers-account-edit-account.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

$wc = '<form class="woocommerce-EditAccountForm edit-account" action="" method="post">'
	. '<p><input name="account_first_name" id="account_first_name" /></p>'
	. '<p><input name="account_email" id="account_email" /></p>'
	. '<p class="sgs-account__marketing-opt-in"><input type="checkbox" name="sgs_marketing_opt_in" /></p>'
	. '<fieldset><legend>Password change</legend><p><input type="password" name="password_1" id="password_1" /></p></fieldset>'
	. '<div class="clear"></div>'
	. '<p><input type="hidden" id="save-account-details-nonce" name="save-account-details-nonce" value="n" /><input type="hidden" name="_wp_http_referer" value="/x" />'
	. '<button type="submit" class="woocommerce-Button button" name="save_account_details" value="Save changes">Save changes</button>'
	. '<input type="hidden" name="action" value="save_account_details" /></p>'
	. '</form>';

$out = sgs_account_edit_account_cards( $wc );

ok( 1 === substr_count( $out, '<form' ), 'still one form' );
ok( 2 === substr_count( $out, 'name="save_account_details"' ), 'two submit buttons, one per card' );
ok( 1 === substr_count( $out, 'sgs-account__edit-card--details' ) && 1 === substr_count( $out, 'sgs-account__edit-card--password' ), 'a details card and a password card' );
$d = strpos( $out, 'sgs-account__edit-card--details' );
$m = strpos( $out, 'sgs_marketing_opt_in' );
$p = strpos( $out, 'sgs-account__edit-card--password' );
ok( $d < $m && $m < $p, 'the marketing tick sits in the details card, above the password card' );
$b1 = strpos( $out, 'name="save_account_details"' );
$b2 = strrpos( $out, 'name="save_account_details"' );
ok( $m < $b1 && $b1 < $p && $p < $b2, 'DOM order: details fields, details button, password card, password button' );
ok( str_contains( $out, 'Update password</button>' ) && str_contains( $out, 'sgs-account__save-password' ), 'the password button has its own label and class' );
ok( str_contains( $out, 'name="action" value="save_account_details"' ) && str_contains( $out, 'save-account-details-nonce' ), 'nonce and action fields kept' );
ok( ! str_contains( $out, '<p><input type="hidden"' ), 'no empty paragraph left around the hidden fields' );
$bare = '<form class="woocommerce-EditAccountForm"><fieldset><legend>x</legend></fieldset></form>';
ok( $bare === sgs_account_edit_account_cards( $bare ), 'a template without WooCommerce\'s Save button is left alone' );

echo $failures ? "\n{$failures} FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
