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
function wp_strip_all_tags( $t ) { return trim( strip_tags( (string) $t ) ); }
function wp_specialchars_decode( $t ) { return htmlspecialchars_decode( (string) $t, ENT_QUOTES ); }
function sanitize_text_field( $t ) { return trim( strip_tags( (string) $t ) ); }
function wp_json_encode( $v, $f = 0 ) { return json_encode( $v, $f ); }
function get_option( $k, $d = false ) { return $GLOBALS['options'][ $k ] ?? $d; }
function register_setting( $g, $n, $a = array() ) { $GLOBALS['settings'][ $n ] = $a; }
function wp_script_is( $h, $s = 'enqueued' ) { if ( 'wp-i18n' === $h ) { return $GLOBALS['i18n_done']; } return 'enqueued' === $s ? in_array( $h, $GLOBALS['enqueued'] ?? array(), true ) : in_array( $h, array_keys( $GLOBALS['registered'] ?? array() ), true ); }
function wp_register_script( $h, $src = false, $deps = array(), $v = false, $f = false ) { $GLOBALS['registered'][ $h ] = $deps; return true; }
function wp_enqueue_script( $h ) { $GLOBALS['enqueued'][] = $h; }
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
	ok( '<h2 class="sgs-account__heading sgs-account__tab-heading">Orders</h2>' === $html, 'the H2 renders on the orders endpoint when set' );
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
	$sum_block = array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsCheckoutStrings' => array( 'summaryTitle' => 'Your bag' ) ) );
	$GLOBALS['inline'] = array();
	SGS\Blocks\sgs_checkout_strings_inject( '<div>checkout</div>', $sum_block );
	ok( false !== strpos( (string) ( $GLOBALS['inline'][0][1] ?? '' ), '"Order summary":"Your bag"' ), 'summaryTitle rewrites the Order summary heading' );
	$GLOBALS['inline'] = array();
	SGS\Blocks\sgs_checkout_strings_inject( '<div>checkout</div>', array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsCheckoutStrings' => array( 'emailLabel' => 'Email', 'cityLabel' => 'Town or city', 'newPasswordLabel' => 'Choose a password' ) ) ) );
	$words = (string) ( $GLOBALS['inline'][0][1] ?? '' );
	ok( false !== strpos( $words, '"Email address":"Email"' ) && false !== strpos( $words, '"City":"Town or city"' ) && false !== strpos( $words, '"Create a password":"Choose a password"' ), 'emailLabel, cityLabel and newPasswordLabel rewrite the email, city and password field labels' );
	$GLOBALS['inline'] = array( array( 'wp-i18n', $js ) );
	ok( false !== strpos( $js, 'i18n.gettext_woocommerce' ) && false !== strpos( $js, '"Log in":"Sign in"' ) && false !== strpos( $js, '"Or continue below":"or pay by card"' ) && false === strpos( $js, 'bogus' ), 'the script filters the woocommerce domain with the supported keys only' );
	$GLOBALS['i18n_done'] = true;
	$GLOBALS['inline']    = array();
	$out                  = SGS\Blocks\sgs_checkout_strings_inject( '<div>checkout</div>', $block );
	ok( '<div>checkout</div>' === $out && 1 === count( $GLOBALS['inline'] ) && 'wp-i18n' !== $GLOBALS['inline'][0][0] && in_array( $GLOBALS['inline'][0][0], $GLOBALS['enqueued'] ?? array(), true ), 'after wp-i18n has printed, the script goes through its own enqueued handle, never into the content' );
	ok( false === strpos( $GLOBALS['inline'][0][1], '&#038;' ), 'the checkout wording script carries no encoded ampersand' );
	$GLOBALS['i18n_done'] = false;
	$GLOBALS['inline']    = array();
	$out                  = SGS\Blocks\sgs_checkout_strings_inject( '<div>checkout</div>', array( 'blockName' => 'woocommerce/checkout', 'attrs' => array() ) );
	ok( '<div>checkout</div>' === $out && array() === $GLOBALS['inline'], 'an unset block prints nothing' );
	ok( false !== strpos( $js, 'window.sgsCheckoutStringsApplied' ) && false !== strpos( $js, 'wp-block-woocommerce-checkout' ), 'the filter runs once per page and only while the Checkout block is on it' );
	$node = trim( (string) shell_exec( 'node -v 2>&1' ) );
	if ( 0 === strpos( $node, 'v' ) ) {
		$file = sys_get_temp_dir() . '/sgs-checkout-strings-' . getmypid() . '.js';
		file_put_contents( $file, 'var f=[];global.document={querySelector:function(s){return global.hasCheckout?{}:null;}};global.window={wp:{hooks:{addFilter:function(h,n,cb){f.push(cb);}}}};' . $js . $js . 'global.hasCheckout=false;var off=f[0]("Log in","Log in","woocommerce");global.hasCheckout=true;var on=f[0]("Log in","Log in","woocommerce");console.log(f.length+"|"+off+"|"+on);' );
		$out = trim( (string) shell_exec( 'node ' . escapeshellarg( $file ) . ' 2>&1' ) );
		unlink( $file );
		ok( 'Log in' === explode( '|', $out )[1] && 'Sign in' === explode( '|', $out )[2] && '1' === explode( '|', $out )[0], 'run twice it adds one filter; it rewrites only with the Checkout block present' );
	}
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
	$GLOBALS['inline']   = array();
	$GLOBALS['enqueued'] = array();
	$out                 = SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>checkout</div>', array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsItemShowBrand' => true, 'sgsSummaryEditLinkLabel' => 'Edit' ) ) );
	$js                  = $GLOBALS['inline'][0][1] ?? '';
	ok( '<div>checkout</div>' === $out && false !== strpos( $js, 'sgsCheckoutSummaryExtrasConfig={"editLabel":"Edit"' ) && false !== strpos( $js, 'sgs-checkout-item-brand' ) && in_array( $GLOBALS['inline'][0][0] ?? '', $GLOBALS['enqueued'], true ), 'the checkout block gets the config and the script through an enqueued handle, its content untouched' );
	ok( false !== strpos( $js, '&&' ) && false === strpos( $js, '&#038;' ), 'the summary extras script is printed with its && intact' );
	$c = SGS\Blocks\sgs_commerce_look_summary_extras( array( 'sgsCheckoutStrings' => array( 'loginPrefix' => 'Already have an account? ' ) ), 'https://example.test/bag/' );
	ok( 'Already have an account?' === ( $c['loginPrefix'] ?? null ) && '' === $c['editLabel'] && false === $c['brand'], 'loginPrefix alone configures the prefix and is stripped of tags and edge spaces (the span margin makes the gap)' );
	ok( '' === ( SGS\Blocks\sgs_commerce_look_summary_extras( array( 'sgsItemShowBrand' => true ), 'https://example.test/bag/' )['loginPrefix'] ?? 'x' ), 'no loginPrefix when it is not set' );
	ok( array() === SGS\Blocks\sgs_checkout_strings_map( array( 'loginPrefix' => 'Already have an account? ' ) ), 'loginPrefix is not a gettext key, so the translation filter never carries it' );
	$css = SGS\Blocks\sgs_commerce_look_line_items_css( array( 'sgsCheckoutStrings' => array( 'loginPrefix' => 'Already have an account? ' ) ), 'checkout', '.root' );
	ok( false !== strpos( $css, '.root .sgs-checkout-login-prefix{float:right;' ) && false === strpos( $css, 'white-space:nowrap' ) && false !== strpos( $css, 'max-width:70%' ) && false !== strpos( $css, 'overflow-wrap:anywhere' ) && false !== strpos( $css, 'margin:-24px 0.35em 0 0' ) && false !== strpos( $css, '.root .wc-block-checkout__login-prompt{margin-bottom:24px;}' ), 'the login prefix keeps on one line beside the link (a floated span that may wrap inside 70% of its row, with the same top offset as the link)' );
	ok( '' === SGS\Blocks\sgs_commerce_look_line_items_css( array( 'sgsItemShowBrand' => true ), 'checkout', '.root' ) && '' === SGS\Blocks\sgs_commerce_look_line_items_css( array( 'sgsCheckoutStrings' => array( 'loginPrefix' => 'x' ) ), 'cart', '.root' ), 'no prefix rule without the setting, and none on the cart' );
	$long = SGS\Blocks\sgs_commerce_look_summary_extras( array( 'sgsCheckoutStrings' => array( 'loginPrefix' => str_repeat( 'é', 130 ) ) ), 'https://example.test/bag/' );
	ok( 120 === mb_strlen( $long['loginPrefix'] ) && mb_check_encoding( $long['loginPrefix'], 'UTF-8' ), 'a long prefix is cut at 120 characters, never inside a multibyte character' );
	$amp = SGS\Blocks\sgs_commerce_look_summary_extras( array( 'sgsCheckoutStrings' => array( 'loginPrefix' => 'Tom &amp; <b>Jerry</b>' ) ), 'https://example.test/bag/' );
	ok( 'Tom & Jerry' === $amp['loginPrefix'], 'entities are decoded after the tags are stripped' );
	$GLOBALS['inline']   = array();
	$GLOBALS['enqueued'] = array();
	$twice               = array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsItemShowBrand' => true ) );
	SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>a</div>', $twice );
	SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>b</div>', $twice );
	ok( 1 === count( $GLOBALS['inline'] ), 'a second render does not add the inline config twice' );
	$out = SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>checkout</div>', array( 'blockName' => 'woocommerce/checkout', 'attrs' => array() ) );
	ok( '<div>checkout</div>' === $out, 'an unset checkout block is unchanged' );
	$out = SGS\Blocks\sgs_commerce_look_summary_extras_inject( '<div>cart</div>', array( 'blockName' => 'woocommerce/cart', 'attrs' => array( 'sgsItemShowBrand' => true ) ) );
	ok( '<div>cart</div>' === $out, 'the cart block is unchanged' );
}

// 7) Heading bottom margin.
foreach ( array( 'helpers-responsive.php', 'helpers-border-style.php', 'account/helpers-account-look-css.php', 'account/helpers-account-render-css.php' ) as $dep ) {
	if ( is_file( $base . '/includes/' . $dep ) ) {
		require_once $base . '/includes/' . $dep;
	}
}
if ( function_exists( 'sgs_account_heading_spacing_css' ) ) {
	ok( '' === sgs_account_heading_spacing_css( array(), '.r' ), 'headingMarginBottom unset prints nothing, so 0.5rem stays' );
	$css = sgs_account_heading_spacing_css( array( 'headingMarginBottom' => array( 'desktop' => '20px' ) ), '.r' );
	ok( false !== strpos( $css, '.r .sgs-account__heading' ) && false !== strpos( $css, 'margin-bottom:20px' ), 'headingMarginBottom prints a real margin-bottom on the heading' );
} else {
	ok( false, 'sgs_account_heading_spacing_css exists' );
}

echo "\n$passes passed, $failures failed\n";
exit( $failures > 0 ? 1 : 0 );
