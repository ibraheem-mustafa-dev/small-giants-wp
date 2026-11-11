<?php
/**
 * Standalone test: the account tab buttons take the button preset (the saved-items empty link, Select options),
 * the lost-password Back link sits under the form, the account details Mobile field replaces the checkout's own
 * and carries an optional line, and the Saved items tab shows the shared empty card while the list is empty.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-r14-standalone.php [path to a plugin copy]
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = rtrim( $argv[1] ?? dirname( __DIR__, 2 ), '/\\' );
define( 'ABSPATH', $base . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );
$GLOBALS['saved'] = array();

function is_user_logged_in() { return true; }
require $base . '/scripts/qa/lib/wp-stubs.php';
require $base . '/includes/render-helpers.php';
if ( ! function_exists( 'esc_url_raw' ) ) { function esc_url_raw( $u ) { return (string) $u; } }
if ( ! function_exists( 'esc_url' ) ) { function esc_url( $u ) { return (string) $u; } }
if ( ! function_exists( 'get_current_user_id' ) ) { function get_current_user_id() { return 7; } }
if ( ! function_exists( 'get_user_meta' ) ) { function get_user_meta( $id, $k, $s = false ) { return '_sgs_wishlist' === $k ? json_encode( $GLOBALS['saved'] ) : '07700 900123'; } }
if ( ! function_exists( 'wc_get_page_permalink' ) ) { function wc_get_page_permalink( $p ) { return 'https://example.test/' . $p . '/'; } }
if ( ! function_exists( 'home_url' ) ) { function home_url( $p = '' ) { return 'https://example.test' . $p; } }
if ( ! function_exists( 'wp_get_current_user' ) ) { function wp_get_current_user() { return (object) array( 'display_name' => 'Ada' ); } }
if ( ! function_exists( 'absint' ) ) { function absint( $n ) { return abs( (int) $n ); } }
if ( ! function_exists( 'add_filter' ) ) { function add_filter() {} }
if ( ! function_exists( 'add_action' ) ) { function add_action() {} }
if ( ! function_exists( 'remove_filter' ) ) { function remove_filter() {} }
function render_block( array $b ): string { return '<!--' . $b['blockName'] . ' ' . ( $b['attrs']['label'] ?? '' ) . ' ' . json_encode( $b['attrs'] ) . '-->'; }

foreach ( array( 'account/helpers-account-look-css.php', 'account/helpers-account-header.php', 'account/helpers-account-edit-account.php', 'account/helpers-account-signed-out.php', 'account/class-account-strings.php', 'account/class-account-endpoints.php', 'account/class-account-extras.php', 'wishlist/class-wishlist-store.php' ) as $f ) {
	require_once $base . '/includes/' . $f;
}

use SGS\Blocks\Account_Endpoints;

$failures = 0;
function ok( bool $c, string $label ): void {
	global $failures;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) {
		++$failures;
	}
}

// 1) Extra account buttons take the preset, at natural width.
$css = sgs_account_login_look_css( array( 'loginButtonPreset' => 'primary', 'loginButtonScope' => 'all-forms', 'loginButtonFullWidth' => true ), '.x' );
ok( false !== strpos( $css, '.x .sgs-wishlist-panel__empty-cta{background:var(--wp--custom--button-presets--primary--background)' ), 'the saved-items empty link takes the primary preset' );
ok( false !== strpos( $css, '.x .sgs-wishlist-panel__choose-options:hover{' ), 'Select options has the preset hover rule' );
ok( false === strpos( $css, '.x .sgs-wishlist-panel__empty-cta{width:100%;}' ), 'the extra buttons are not stretched to full width' );
ok( false !== strpos( $css, '.x .sgs-account__wc form .woocommerce-form-login__submit{width:100%;}' ), 'the sign-in button still stretches' );
$none = sgs_account_login_look_css( array( 'loginButtonPreset' => 'primary' ), '.x' );
ok( false === strpos( $none, 'sgs-wishlist-panel__empty-cta' ), 'without the all-forms scope the extra buttons are left alone' );

// 1b) A block notice's action link inside the account content is a text link (the notice look), never a preset button.
$content_buttons = preg_match_all( '/a\.(?:woocommerce-)?button:not\(\.view\)(?!:not\(\.wc-block-components-notice-banner__content \*\))[:{,]/', $css );
ok( 0 === $content_buttons, 'no account content button rule reaches a link inside a block notice (' . $content_buttons . ' unguarded selectors)' );
ok( false !== strpos( $css, '.x .woocommerce-MyAccount-content a.button:not(.view):not(.wc-block-components-notice-banner__content *)' ), 'other account content buttons (Pay, Cancel, Browse products) still take the preset' );

// 2) The Back to sign in link leaves the header and follows the form.
$attrs = array( 'headerLostEyebrow' => 'FORGOTTEN', 'headerLostTitle' => 'Reset', 'headerLostIntro' => 'Enter', 'headerLostBackLabel' => 'Back to sign in' );
ok( false === strpos( sgs_account_header_html( $attrs, 'lost' ), 'header-back' ), 'the lost-password header holds no Back link' );
ok( function_exists( 'sgs_account_lost_back_html' ) && false !== strpos( sgs_account_lost_back_html( $attrs, 'lost' ), 'class="sgs-account__header-back"' ), 'the Back link prints for the lost-password view' );
ok( function_exists( 'sgs_account_lost_back_html' ) && '' === sgs_account_lost_back_html( $attrs, 'signin' ), 'no Back link on the sign-in view' );
ok( function_exists( 'sgs_account_lost_back_html' ) && '' === sgs_account_lost_back_html( array(), 'lost' ), 'no Back link without a label' );

// 2b) The confirmation and new-password views word themselves, and keep the request header when unworded.
$sent_attrs = $attrs + array( 'headerLostSentTitle' => 'Check your email', 'headerLostSentIntro' => 'A link is on its way.', 'headerLostResetTitle' => 'Choose a new password', 'headerLostResetIntro' => '8 characters or more.' );
ok( false !== strpos( sgs_account_header_html( $sent_attrs, 'lost-sent' ), 'Check your email' ) && false !== strpos( sgs_account_header_html( $sent_attrs, 'lost-sent' ), 'FORGOTTEN' ), 'the confirmation view has its own title and keeps the eyebrow' );
ok( false !== strpos( sgs_account_header_html( $sent_attrs, 'lost-reset' ), 'Choose a new password' ), 'the new-password view has its own title' );
ok( false !== strpos( sgs_account_header_html( $attrs, 'lost-sent' ), '>Reset</' ), 'an unworded confirmation keeps the request header' );
ok( '' !== sgs_account_lost_back_html( $attrs, 'lost-sent' ) && '' === sgs_account_lost_back_html( $attrs, 'lost-reset' ), 'the Back link shows on the confirmation, not on the new-password form' );
Account_Endpoints::$active = $sent_attrs;
ok( str_ends_with( (string) SGS\Blocks\Account_Extras::maybe_swap_lost_confirmation_template( '/wc/lost-password-confirmation.php', 'myaccount/lost-password-confirmation.php' ), 'templates/lost-sent.php' ), 'a worded confirmation drops the WooCommerce message' );
Account_Endpoints::$active = $attrs;
ok( '/wc/x.php' === SGS\Blocks\Account_Extras::maybe_swap_lost_confirmation_template( '/wc/x.php', 'myaccount/lost-password-confirmation.php' ), 'an unworded confirmation keeps the WooCommerce message' );

// 2c) The new-password form's repeat label and button can be reworded.
$GLOBALS['gettext'] = array();
\SGS\Blocks\Account_Strings::begin( array( 'strings' => array( 'resetConfirmLabel' => 'Type it again', 'savePassword' => 'Save new password' ) ) );
ok( 'Type it again' === \SGS\Blocks\Account_Strings::filter( 'Re-enter new password', 'Re-enter new password', 'woocommerce' ) && 'Save new password' === \SGS\Blocks\Account_Strings::filter( 'Save', 'Save', 'woocommerce' ), 'the new-password repeat label and button take the client wording' );
\SGS\Blocks\Account_Strings::end();

// 3) Account details: one Mobile field, with the optional line.
$form = '<form class="woocommerce-EditAccountForm"><p id="account_email_field"><input id="account_email"></p><p class="form-row " id="_wc_other/sgs/mobile_field"><label>Mobile (optional)</label><input name="_wc_other/sgs/mobile"></p><fieldset><legend>Change password</legend></fieldset></form>';
$out  = sgs_account_edit_account_markup( $form, array( 'accountShowMobile' => true, 'accountMobileLabel' => 'Mobile', 'accountMobileHint' => 'For WhatsApp updates' ) );
ok( false === strpos( $out, '_wc_other/sgs/mobile' ), 'the checkout Mobile field is removed from the account form' );
ok( 1 === substr_count( $out, 'type="tel"' ), 'one Mobile input remains' );
ok( false !== strpos( $out, 'id="sgs-account-mobile-hint">For WhatsApp updates</span>' ) && false !== strpos( $out, 'aria-describedby="sgs-account-mobile-hint"' ), 'the line sits under Mobile and describes it' );
$plain = sgs_account_edit_account_markup( $form, array( 'accountShowMobile' => true ) );
ok( false === strpos( $plain, 'sgs-account-mobile-hint' ), 'no line without the setting' );

// 3b) A card with nothing saved takes the setting's line, with its own type.
$cards = '<div class="u-column1 woocommerce-Address"><header class="woocommerce-Address-title title"><h2>Delivery address</h2><a class="edit" href="#">Add</a></header><address>You have not set up this type of address yet.</address></div>'
	. '<div class="u-column2 woocommerce-Address"><header class="woocommerce-Address-title title"><h2>Billing address</h2><a class="edit" href="#">Edit</a></header><address>Ada Lovelace<br/>1 Road</address></div>'
	. '<div class="u-column2 woocommerce-Address"><header class="woocommerce-Address-title title"><h2>Billing address</h2><a class="edit" href="#">Add</a></header><address>You have not set up this type of address yet.</address></div>';
$worded = sgs_account_edit_account_markup( $cards, array( 'addressEmptyText' => 'No {type} address saved yet.' ) );
ok( false !== strpos( $worded, '<address>No delivery address saved yet.</address>' ) && false !== strpos( $worded, '<address>No billing address saved yet.</address>' ), 'an empty address card names its own type' );
ok( false !== strpos( $worded, '<address>Ada Lovelace<br/>1 Road</address>' ), 'a saved address is left as it is' );
$same = sgs_account_edit_account_markup( $cards, array( 'addressEmptyText' => 'No {type} address saved yet.', 'addressSameText' => 'Same as delivery address' ) );
ok( false !== strpos( $same, '<address>Same as delivery address</address>' ) && false !== strpos( $same, '<address>No delivery address saved yet.</address>' ), 'an empty billing card says same as delivery while a delivery address is saved' );
ok( $cards === sgs_account_edit_account_markup( $cards, array() ), 'without the setting WooCommerce\'s line stays' );

// 3b2) The row list's items summary takes type settings (size and unit shown here).
$rowcss = sgs_account_orders_look_css( array( 'ordersRowList' => true, 'ordersSummaryFontSize' => array( 'desktop' => 14 ), 'ordersSummaryFontSizeUnit' => 'px' ), '.x' );
ok( false !== strpos( $rowcss, '.x .sgs-account__orders-list .sgs-account__order .sgs-account__order-summary{font-size:14px' ), 'the order row summary takes its font size setting' );

// 3b3) The order page's address and payment text takes type settings (line height shown here).
$odcss = sgs_account_order_detail_look_css( array( 'orderDetailTextLineHeight' => array( 'desktop' => 24 ), 'orderDetailTextLineHeightUnit' => 'px' ), '.x' );
ok( false !== strpos( $odcss, '.x .sgs-account__od-text{line-height:24px' ), 'the order page text takes its line height setting' );

// 3c) Motion parts carry the block's own classes.
$marked = sgs_account_edit_account_markup( '<div class="woocommerce-MyAccount-content"></div><div class="u-columns col2-set" id="customer_login"></div>', array() );
ok( false !== strpos( $marked, 'woocommerce-MyAccount-content sgs-account__tab-content"' ) && false !== strpos( $marked, 'u-columns col2-set sgs-account__auth-grid" id="customer_login"' ), 'the tab content and the sign-in pair carry classes of the block' );

$lost = sgs_account_edit_account_markup( '<form method="post" class="woocommerce-ResetPassword lost_reset_password"><input type="password" name="password_1" /></form>', array() );
ok( false !== strpos( $lost, '<form method="post" class="woocommerce-ResetPassword lost_reset_password sgs-account__lost-form">' ), 'the forgotten-password and new-password form carries a class of the block (a motion part)' );

// 4) Saved items: the empty card while the list is empty, else the panel.
Account_Endpoints::$active = array( 'tabHeadings' => true, 'wishlistEmptyHeading' => 'Nothing saved yet.', 'wishlistEmptyText' => 'Tap the heart.', 'wishlistEmptyButtonLabel' => 'Shop sunglasses' );
$GLOBALS['saved'] = array();
ob_start();
Account_Endpoints::render_saved_items_endpoint( '' );
$page = ob_get_clean();
ok( false !== strpos( $page, '<h2 class="sgs-account__heading sgs-account__tab-heading">' ), 'the Saved items tab prints its tab heading' );
ok( false !== strpos( $page, 'sgs-account__orders-empty-title">Nothing saved yet.</p>' ) && false !== strpos( $page, 'sgs/button Shop sunglasses' ), 'an empty list shows the shared empty card with its button' );
ok( false === strpos( $page, 'sgs/wishlist-panel' ), 'the wishlist panel is not drawn behind the empty card' );
$GLOBALS['saved'] = array( array( 'id' => 71 ) );
ob_start();
Account_Endpoints::render_saved_items_endpoint( '' );
$page = ob_get_clean();
ok( false !== strpos( $page, 'sgs/wishlist-panel' ) && false === strpos( $page, 'orders-empty' ), 'a list with items shows the wishlist panel' );

// 5) The menu count appears after Wishlist as well as Orders.
$menu = '<nav><ul><li class="woocommerce-MyAccount-navigation-link woocommerce-MyAccount-navigation-link--orders"><a href="#">Orders</a></li><li class="woocommerce-MyAccount-navigation-link woocommerce-MyAccount-navigation-link--saved-items"><a href="#">Wishlist</a></li></ul></nav>';
Account_Endpoints::$active = array( 'menuOrdersCount' => true );
$GLOBALS['saved'] = array( array( 'id' => 71 ), array( 'id' => 72 ) );
ob_start();
SGS\Blocks\Account_Extras::start_menu_buffer();
echo $menu;
SGS\Blocks\Account_Extras::end_menu_buffer();
$counted = ob_get_clean();
ok( false !== strpos( $counted, 'Wishlist<span class="sgs-account__menu-count">2</span>' ), 'the Wishlist link carries its saved count' );
ok( false === strpos( $counted, 'Orders<span' ), 'an Orders link with no orders carries no count' );

// 4b) Frame cards layout for the Saved items tab.
Account_Endpoints::$active = array( 'wishlistLayout' => 'cards' );
ob_start();
Account_Endpoints::render_saved_items_endpoint( '' );
$cards_page = ob_get_clean();
ok( false !== strpos( $cards_page, '"layout":"cards"' ) && false !== strpos( $cards_page, '"showSort":false' ) && false !== strpos( $cards_page, '"mobile":2' ), 'wishlistLayout cards draws the panel as frame cards without sort or dates' );
Account_Endpoints::$active = array();
ob_start();
Account_Endpoints::render_saved_items_endpoint( '' );
ok( false === strpos( ob_get_clean(), '"layout":"cards"' ), 'without the setting the panel keeps its own layout' );

echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
