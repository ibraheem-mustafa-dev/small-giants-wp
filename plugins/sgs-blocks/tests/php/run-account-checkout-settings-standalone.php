<?php
/**
 * Standalone test: account menu order, tab headings and wording keys; checkout wording, the mobile field under
 * Contact and the order summary extras.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-checkout-settings-standalone.php [path to a plugin copy]
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
$base = $argv[1] ?? dirname( __DIR__, 2 );

$GLOBALS['filters']   = array();
$GLOBALS['options']   = array();
$GLOBALS['fields']    = array();
$GLOBALS['inline']    = array();
$GLOBALS['i18n_done'] = false;

function add_filter( $tag, $cb, $prio = 10, $args = 1 ) { $GLOBALS['filters'][ $tag ][] = $cb; }
function add_action( $tag, $cb, $prio = 10, $args = 1 ) { add_filter( $tag, $cb ); }
function remove_filter( $tag, $cb, $prio = 10 ) { unset( $GLOBALS['filters'][ $tag ] ); }
function __( $t, $d = null ) { return $t; }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES ); }
function esc_url_raw( $t ) { return (string) $t; }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) ); }
function sanitize_text_field( $t ) { return trim( strip_tags( (string) $t ) ); }
function wp_json_encode( $v, $f = 0 ) { return json_encode( $v, $f ); }
function get_option( $k, $d = false ) { return $GLOBALS['options'][ $k ] ?? $d; }
function register_setting( $g, $n, $a = array() ) { $GLOBALS['settings'][ $n ] = $a; }
function wp_script_is( $h, $s = 'enqueued' ) { return $GLOBALS['i18n_done']; }
function wp_add_inline_script( $h, $js, $pos = 'after' ) { $GLOBALS['inline'][] = array( $h, $js ); return true; }
function wc_get_cart_url() { return 'https://example.test/bag/'; }
function woocommerce_register_additional_checkout_field( $args ) { $GLOBALS['fields'][] = $args; }
function do_action_sim( $tag, ...$args ) { foreach ( $GLOBALS['filters'][ $tag ] ?? array() as $cb ) { $cb( ...$args ); } }

$GLOBALS['missing'] = 0;
foreach ( array( 'account/class-account-strings.php', 'account/class-account-endpoints.php', 'woocommerce/checkout-strings.php', 'woocommerce/checkout-mobile-field.php', 'woocommerce/commerce-look/line-items.php' ) as $file ) {
	if ( ! is_file( $base . '/includes/' . $file ) ) {
		echo "FAIL missing file includes/$file\n";
		++$GLOBALS['missing'];
		continue;
	}
	require $base . '/includes/' . $file;
}

use SGS\Blocks\Account_Endpoints;
use SGS\Blocks\Account_Strings;

$failures = $GLOBALS['missing'];
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS $label\n";
	} else {
		++$failures;
		echo "FAIL $label\n";
	}
}

// 1) Menu order.
if ( class_exists( Account_Endpoints::class ) ) {
	$base_items                = array( 'dashboard' => 'Dashboard', 'orders' => 'Orders', 'downloads' => 'Downloads', 'edit-address' => 'Addresses', 'edit-account' => 'Account details', 'customer-logout' => 'Log out' );
	Account_Endpoints::$active = array( 'menuOrder' => array( 'orders', 'edit-address', 'saved-items', 'edit-account' ) );
	$got                       = array_keys( Account_Endpoints::filter_menu_items( $base_items ) );
	ok( array( 'orders', 'edit-address', 'saved-items', 'edit-account', 'dashboard', 'downloads', 'customer-logout' ) === $got, 'menuOrder lists the named endpoints first in that order, the rest follow, Log out last' );
	Account_Endpoints::$active = array( 'menuOrder' => array( 'nope', 'orders', 'orders' ) );
	$got                       = array_keys( Account_Endpoints::filter_menu_items( $base_items ) );
	ok( 'orders' === $got[0] && count( $got ) === 7 && 'customer-logout' === end( $got ), 'an unknown or repeated key is ignored' );
	Account_Endpoints::$active = array();
	$got                       = array_keys( Account_Endpoints::filter_menu_items( $base_items ) );
	ok( array( 'dashboard', 'orders', 'saved-items', 'downloads', 'edit-address', 'edit-account', 'customer-logout' ) === $got, 'no menuOrder keeps the default order with Saved items after Orders' );

	Account_Endpoints::register();
	// 2) Tab headings.
	Account_Endpoints::$active = array( 'tabHeadings' => true );
	ob_start();
	do_action_sim( 'woocommerce_account_orders_endpoint', '' );
	$html = ob_get_clean();
	ok( '<h2 class="sgs-account__tab-heading">Orders</h2>' === $html, 'the H2 renders on the orders endpoint when set' );
	ob_start();
	do_action_sim( 'woocommerce_account_edit-address_endpoint', '' );
	$html = ob_get_clean();
	ok( false !== strpos( $html, '>Addresses</h2>' ), 'the H2 renders on the addresses list' );
	ob_start();
	do_action_sim( 'woocommerce_account_edit-address_endpoint', 'billing' );
	$html = ob_get_clean();
	ok( '' === $html, 'a single-address form keeps its own title' );
	ob_start();
	do_action_sim( 'woocommerce_account_edit-account_endpoint', '' );
	$html = ob_get_clean();
	ok( false !== strpos( $html, '>Account details</h2>' ), 'the H2 renders on account details' );
	Account_Endpoints::$active = array();
	ob_start();
	do_action_sim( 'woocommerce_account_orders_endpoint', '' );
	$html = ob_get_clean();
	ok( '' === $html, 'no heading when the setting is off' );
	Account_Endpoints::$active = null;
	ob_start();
	do_action_sim( 'woocommerce_account_orders_endpoint', '' );
	$html = ob_get_clean();
	ok( '' === $html, 'no heading outside the account block' );
}

// 3) Wording keys.
if ( class_exists( Account_Strings::class ) ) {
	$expected = array(
		'registerEmailLabel'   => 'Email address',
		'newPasswordLabel'     => 'New password (leave blank to leave unchanged)',
		'confirmPasswordLabel' => 'Confirm new password',
		'currentPasswordLabel' => 'Current password (leave blank to leave unchanged)',
	);
	foreach ( $expected as $key => $original ) {
		ok( ( Account_Strings::supported()[ $key ] ?? null ) === $original, "supported() maps $key to WooCommerce's original text" );
		Account_Strings::begin( array( 'strings' => array( $key => 'Custom ' . $key ) ) );
		ok( 'Custom ' . $key === Account_Strings::filter( $original, $original, 'woocommerce' ), "$key rewrites the original during the block's render" );
		Account_Strings::end();
		ok( $original === Account_Strings::filter( $original, $original, 'woocommerce' ), "$key is inert after end()" );
	}
	ok( 'Username or email address' === Account_Strings::supported()['usernameLabel'] && 'Username or email' === Account_Strings::supported()['lostUsernameLabel'], 'usernameLabel and lostUsernameLabel are untouched' );
}

// 4) Checkout wording.
if ( function_exists( 'SGS\Blocks\sgs_checkout_strings_inject' ) ) {
	$block = array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsCheckoutStrings' => array( 'loginLink' => 'Sign in', 'expressDivider' => 'or pay by card', 'bogus' => 'x' ) ) );
	$out   = SGS\Blocks\sgs_checkout_strings_inject( '<div>checkout</div>', $block );
	ok( '<div>checkout</div>' === $out && 1 === count( $GLOBALS['inline'] ) && 'wp-i18n' === $GLOBALS['inline'][0][0], 'before wp-i18n prints, the filter script is appended to that handle' );
	$js = $GLOBALS['inline'][0][1] ?? '';
	ok( false !== strpos( $js, 'i18n.gettext_woocommerce' ) && false !== strpos( $js, '"Log in":"Sign in"' ) && false !== strpos( $js, '"Or continue below":"or pay by card"' ) && false === strpos( $js, 'bogus' ), 'the script filters the woocommerce domain with the supported keys only' );
	$GLOBALS['i18n_done'] = true;
	$out                  = SGS\Blocks\sgs_checkout_strings_inject( '<div>checkout</div>', $block );
	ok( 0 === strpos( $out, '<div>checkout</div><script>' ), 'after wp-i18n has printed, the script follows the block markup' );
	$GLOBALS['i18n_done'] = false;
	$GLOBALS['inline']    = array();
	$out                  = SGS\Blocks\sgs_checkout_strings_inject( '<div>checkout</div>', array( 'blockName' => 'woocommerce/checkout', 'attrs' => array() ) );
	ok( '<div>checkout</div>' === $out && array() === $GLOBALS['inline'], 'an unset block prints nothing' );
	SGS\Blocks\sgs_checkout_strings_inject( '<div>cart</div>', array( 'blockName' => 'woocommerce/cart', 'attrs' => $block['attrs'] ) );
	ok( array() === $GLOBALS['inline'], 'the cart block is never touched' );
}

// 5) Mobile field.
if ( function_exists( 'SGS\Blocks\sgs_checkout_mobile_register_field' ) ) {
	SGS\Blocks\sgs_checkout_mobile_register_field();
	ok( array() === $GLOBALS['fields'], 'the mobile field is absent when the option is not set' );
	$GLOBALS['options']['sgs_checkout_mobile_field'] = array( 'label' => 'Mobile', 'placeholder' => 'Mobile - so I can WhatsApp you updates' );
	SGS\Blocks\sgs_checkout_mobile_register_field();
	$f = $GLOBALS['fields'][0] ?? array();
	ok( 1 === count( $GLOBALS['fields'] ) && 'sgs/mobile' === ( $f['id'] ?? '' ) && 'contact' === ( $f['location'] ?? '' ) && false === ( $f['required'] ?? true ) && 'Mobile' === ( $f['label'] ?? '' ) && 'Mobile - so I can WhatsApp you updates' === ( $f['optionalLabel'] ?? '' ), 'the mobile field is registered in the contact location, optional, when the option is set' );
}

// 6) Order summary extras.
if ( function_exists( 'SGS\Blocks\sgs_commerce_look_summary_extras' ) ) {
	ok( array() === SGS\Blocks\sgs_commerce_look_summary_extras( array(), 'https://example.test/bag/' ), 'no extras when neither setting is set' );
	$c = SGS\Blocks\sgs_commerce_look_summary_extras( array( 'sgsSummaryEditLinkLabel' => 'Edit', 'sgsItemShowBrand' => true ), 'https://example.test/bag/' );
	ok( 'Edit' === $c['editLabel'] && 'https://example.test/bag/' === $c['editUrl'] && true === $c['brand'], 'the Edit link and the brand are both configured' );
	$c = SGS\Blocks\sgs_commerce_look_summary_extras( array( 'sgsItemShowBrand' => true ), 'https://example.test/bag/' );
	ok( '' === $c['editLabel'] && true === $c['brand'], 'the brand alone leaves the Edit link off' );
	$out = SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>checkout</div>', array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsItemShowBrand' => true, 'sgsSummaryEditLinkLabel' => 'Edit' ) ) );
	ok( false !== strpos( $out, 'sgsCheckoutSummaryExtrasConfig={"editLabel":"Edit"' ) && false !== strpos( $out, 'sgs-checkout-item-brand' ), 'the checkout block gets the config and the script' );
	$out = SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>checkout</div>', array( 'blockName' => 'woocommerce/checkout', 'attrs' => array() ) );
	ok( '<div>checkout</div>' === $out, 'an unset checkout block is unchanged' );
	$out = SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>cart</div>', array( 'blockName' => 'woocommerce/cart', 'attrs' => array( 'sgsItemShowBrand' => true ) ) );
	ok( '<div>cart</div>' === $out, 'the cart block is unchanged' );
}

echo "\n$passes passed, $failures failed\n";
exit( $failures > 0 ? 1 : 0 );
