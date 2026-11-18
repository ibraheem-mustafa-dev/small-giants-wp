<?php
/**
 * Standalone test: sgs/account's last-name field, "email me" tick, create-account row spacing and signed-in redirect
 * (includes/account/class-account-extras.php, helpers-account-cells-css.php, class-account-redirect.php).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-register-redirect-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

$GLOBALS['hooks'] = array();
$GLOBALS['meta']  = array();
function add_filter( $tag, $cb, $prio = 10, $args = 1 ) { $GLOBALS['hooks'][ $tag ][] = array( $cb, $prio ); }
function add_action( $tag, $cb, $prio = 10, $args = 1 ) { add_filter( $tag, $cb, $prio ); }
function __( $t, $d = null ) { return $t; }
function esc_html__( $t, $d = null ) { return $t; }
function wp_unslash( $v ) { return $v; }
function wp_verify_nonce( $nonce, $action ) { return 'good-nonce' === $nonce && 'woocommerce-register' === $action ? 1 : false; }
function update_user_meta( $id, $k, $v ) { $GLOBALS['meta'][ $id ][ $k ] = $v; return true; }
function home_url( $path = '' ) { return ( $GLOBALS['sgs_test_home'] ?? 'https://example.test' ) . $path; }
function wp_parse_url( $url, $component = -1 ) { return parse_url( $url, $component ); }
function wc_get_page_permalink( $p ) { return 'https://example.test/my-account/'; }
function wp_login_url() { return 'https://example.test/wp-login.php'; }
function is_post_publicly_viewable( $p ) { return true; }
class WooCommerce {}
class WP_Error {
	public $codes = array();
	public function add( $code, $msg ) { $this->codes[] = $code; }
}
require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'sgs_object_attr_keys' ) ) {
	function sgs_object_attr_keys( $block ) { return array(); }
}

$root = dirname( __DIR__, 2 ) . '/includes';
require $root . '/render-helpers.php';
require $root . '/helpers-responsive.php';
require $root . '/account/helpers-account-look-css.php';
require $root . '/account/helpers-account-cells-css.php';
require $root . '/account/class-account-strings.php';
require $root . '/account/class-account-endpoints.php';
require $root . '/account/class-account-dashboard.php';
require $root . '/account/class-account-extras.php';
require $root . '/account/class-account-redirect.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}
function capture( callable $fn ): string {
	ob_start();
	$fn();
	return (string) ob_get_clean();
}
use SGS\Blocks\Account_Endpoints as EP;
use SGS\Blocks\Account_Extras as EX;
use SGS\Blocks\Account_Redirect as RD;

// 1) Last name field: printed only when on.
EP::$active = array();
ok( '' === capture( array( EX::class, 'register_last_name_field' ) ), '1 last name: nothing printed while off' );
EP::$active = array( 'registerShowLastName' => true );
$html = capture( array( EX::class, 'register_last_name_field' ) );
ok( str_contains( $html, 'id="reg_last_name"' ) && str_contains( $html, 'name="last_name"' ) && str_contains( $html, '<label for="reg_last_name">Last name' ) && str_contains( $html, ' required aria-required="true"' ), '1 last name: field, default label, required when on' );
EP::$active = array( 'registerShowLastName' => true, 'registerLastNameLabel' => 'Surname <b>' );
ok( str_contains( capture( array( EX::class, 'register_last_name_field' ) ), 'Surname &lt;b&gt;' ), '1 last name: custom label is escaped' );
$_POST = array( 'last_name' => '<i>Khan</i> ' );
EX::save_last_name( 5 );
ok( array() === ( $GLOBALS['meta'][5] ?? array() ), '1 last name: nothing saved when the form did not carry the field' );
$_POST['sgs_register_last_name'] = '1';
EX::save_last_name( 5 );
ok( 'Khan' === ( $GLOBALS['meta'][5]['last_name'] ?? '' ) && 'Khan' === ( $GLOBALS['meta'][5]['billing_last_name'] ?? '' ), '1 last name: sanitised value saved to last_name and billing_last_name' );
$_POST['last_name'] = '  ';
$err = new WP_Error();
EX::validate_last_name( $err );
ok( array( 'registration-error-missing-last-name' ) === $err->codes, '1 last name: blank is rejected when the field was on the form' );
$_POST = array();
$err = new WP_Error();
EX::validate_last_name( $err );
ok( array() === $err->codes, '1 last name: no error when the form did not carry the field' );

// 2) Marketing tick: printed only when on, unticked, label escaped; meta only when ticked.
EP::$active = array();
ok( '' === capture( array( EX::class, 'register_marketing_opt_in_field' ) ), '2 tick: nothing printed while off' );
EP::$active = array( 'registerShowMarketingOptIn' => true );
$html = capture( array( EX::class, 'register_marketing_opt_in_field' ) );
ok( str_contains( $html, 'type="checkbox"' ) && ! str_contains( $html, 'checked' ) && ! str_contains( $html, 'required' ) && str_contains( $html, 'Email me news and offers' ), '2 tick: checkbox, unticked, not required, default label' );
EP::$active = array( 'registerShowMarketingOptIn' => true, 'registerMarketingOptInLabel' => 'Mail <script>' );
ok( str_contains( capture( array( EX::class, 'register_marketing_opt_in_field' ) ), 'Mail &lt;script&gt;' ), '2 tick: custom label is escaped' );
$GLOBALS['meta'] = array();
$_POST = array( 'sgs_register_marketing' => '1', 'woocommerce-register-nonce' => 'good-nonce' );
EX::save_marketing_opt_in( 9 );
ok( array() === ( $GLOBALS['meta'][9] ?? array() ), '2 tick: unticked records nothing' );
$_POST['sgs_marketing_opt_in'] = '1';
$_POST['woocommerce-register-nonce'] = 'bad';
EX::save_marketing_opt_in( 9 );
ok( array() === ( $GLOBALS['meta'][9] ?? array() ), '2 tick: ticked with a bad nonce records nothing' );
$_POST['woocommerce-register-nonce'] = 'good-nonce';
unset( $_POST['sgs_register_marketing'] );
EX::save_marketing_opt_in( 9 );
ok( array() === ( $GLOBALS['meta'][9] ?? array() ), '2 tick: a form without the field records nothing (checkout account creation)' );
$_POST['sgs_register_marketing'] = '1';
EX::save_marketing_opt_in( 9 );
ok( '1' === ( $GLOBALS['meta'][9]['sgs_marketing_opt_in'] ?? '' ) && 1 === preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', (string) ( $GLOBALS['meta'][9]['sgs_marketing_opt_in_at'] ?? '' ) ), '2 tick: ticked with a good nonce records the flag and a GMT datetime' );
$_POST = array();

// 3) Hooks are wired on WooCommerce's registration flow.
EX::register();
$tags = array_keys( $GLOBALS['hooks'] );
ok( in_array( 'woocommerce_register_form', $tags, true ) && in_array( 'woocommerce_created_customer', $tags, true ) && in_array( 'woocommerce_registration_errors', $tags, true ), '3 register hooks are wired' );
RD::register();
ok( isset( $GLOBALS['hooks']['template_redirect'], $GLOBALS['hooks']['woocommerce_registration_redirect'], $GLOBALS['hooks']['woocommerce_login_redirect'] ), '3 redirect hooks are wired' );

// 4) Row spacing: defaults off keeps the stored output; the setting gives the register form a grid to space.
$attrs    = array( 'loginFormRowGap' => array( 'desktop' => 12, 'mobile' => 8 ), 'authPairGap' => array( 'desktop' => 20 ), 'registerHintMarginTop' => array( 'desktop' => 4 ) );
$expected = trim( (string) file_get_contents( __DIR__ . '/fixtures/account-defaults-off.expected.css' ) );
ok( '' !== $expected && $expected === sgs_account_cells_css( $attrs, '.u1.wp-block-sgs-account' ), '4 defaults off: scoped CSS is byte-identical to the stored expectation' );
ok( '' === sgs_account_cells_css( array(), '.u1.wp-block-sgs-account' ), '4 defaults off: no settings print nothing' );
$on = sgs_account_cells_css( $attrs + array( 'authFormRowGap' => array( 'desktop' => 14 ) ), '.u1.wp-block-sgs-account' );
ok( str_contains( $on, '#customer_login form.woocommerce-form-register{display:grid;}' ) && str_contains( $on, '#customer_login form{row-gap:14px' ), '4 authFormRowGap: register form becomes a grid and the gap applies' );
ok( ! str_contains( sgs_account_cells_css( array( 'authFormRowGap' => 'bad' ), '.u1.wp-block-sgs-account' ), 'display:grid' ), '4 authFormRowGap: an unusable value prints no grid rule' );

// 4b) First and last name in one row: off prints nothing new; on prints the two-column rule only for the chosen devices.
$row = array( 'registerNameRow' => array( 'desktop' => true, 'tablet' => true, 'mobile' => false ) );
ok( $expected === sgs_account_cells_css( $attrs + array( 'registerNameRow' => array() ), '.u1.wp-block-sgs-account' ), '4b setting empty: output byte-identical to the stored expectation' );
$nr = sgs_account_cells_css( $row, '.u1.wp-block-sgs-account' );
ok( 2 === substr_count( $nr, 'grid-template-columns:repeat(2,minmax(0,1fr))' ), '4b default-on: two-column rule for desktop and tablet only' );
ok( str_contains( $nr, SGS_Breakpoints::media( 'desktop' ) ) && str_contains( $nr, SGS_Breakpoints::media( 'tablet-only' ) ) && ! str_contains( $nr, SGS_Breakpoints::media( 'mobile' ) ), '4b mobile stays stacked: no mobile rule' );
ok( str_contains( $nr, 'column-gap:1rem' ) && ! str_contains( $nr, 'style=' ), '4b no row gap set: fallback column gap, no inline style' );
$nr2 = sgs_account_cells_css( array( 'registerNameRow' => array( 'mobile' => true ), 'authFormRowGap' => array( 'desktop' => 20, 'mobile' => 8 ) ), '.u1.wp-block-sgs-account' );
ok( 1 === substr_count( $nr2, 'grid-template-columns' ) && str_contains( $nr2, 'column-gap:8px' ), '4b mobile only: one rule, column gap follows the mobile row gap' );
ok( str_contains( $nr, ':has(#reg_first_name):has(#reg_last_name)' ) && str_contains( $nr, '> *{grid-column:1/-1;}' ), '4b only a form with both fields is touched; other rows span both columns' );

// 5) Redirect decision (pure).
$base = array( 'logged_in' => true, 'method' => 'GET', 'request_url' => '/sign-in/', 'destination' => 'https://example.test/my-account/' );
ok( 'https://example.test/my-account/' === RD::decide( $base ), '5 signed in on a sign-in page: redirect' );
ok( null === RD::decide( array( 'logged_in' => false ) + $base ), '5 signed out: no redirect' );
ok( null === RD::decide( array( 'destination' => '' ) + $base ), '5 setting empty: no redirect' );
ok( null === RD::decide( array( 'request_url' => '/my-account/' ) + $base ), '5 already the destination: no loop' );
ok( null === RD::decide( array( 'request_url' => '/My-Account?x=1' ) + $base ), '5 destination with another case, no slash and a query: no loop' );
foreach ( array( 'is_rest', 'is_ajax', 'is_cron', 'is_admin', 'is_preview', 'has_endpoint' ) as $flag ) {
	ok( null === RD::decide( array( $flag => true ) + $base ), "5 {$flag}: no redirect" );
}
ok( null === RD::decide( array( 'method' => 'POST' ) + $base ), '5 a POST: no redirect' );
ok( 'https://example.test/my-account/?a=1' === RD::decide( array( 'destination' => 'https://example.test/my-account/?a=1', 'request_url' => '/my-account/' ) + $base ), '5 destination with a query differs from the bare page' );

// 6) After login or registration: one hop, only from a referring page that holds the setting.
$acct = 'https://example.test/my-account/';
ok( $acct === RD::after_auth_target( 'https://example.test/sign-in/', 'https://example.test/sign-in/', $acct ), '6 WooCommerce would return to the sign-in page: go to the destination' );
ok( 'https://example.test/sign-in/' === RD::after_auth_target( 'https://example.test/sign-in/', 'https://example.test/sign-in/', '' ), '6 referring page holds no setting: unchanged' );
ok( 'https://example.test/checkout/' === RD::after_auth_target( 'https://example.test/checkout/', 'https://example.test/sign-in/', $acct ), '6 an explicit redirect elsewhere (checkout) is kept' );
ok( $acct === RD::after_auth_target( $acct, $acct, $acct ), '6 referrer is the destination: unchanged' );

// 7) Finding the setting in parsed blocks (typed address, account source, nested, and the stated limit).
$tree = array( array( 'blockName' => 'core/group', 'attrs' => array(), 'innerBlocks' => array( array( 'blockName' => 'sgs/account', 'attrs' => array( 'signedInRedirectUrl' => '/welcome/' ), 'innerBlocks' => array() ) ) ) );
ok( 'https://example.test/welcome/' === RD::destination_in_blocks( $tree ), '7 typed site-relative address is found in a nested block and made absolute' );
ok( 'https://example.test/my-account/' === RD::destination_in_blocks( array( array( 'blockName' => 'sgs/account', 'attrs' => array( 'signedInRedirectUrlSource' => 'account' ), 'innerBlocks' => array() ) ) ), '7 the account source resolves to the My Account page' );
ok( '' === RD::destination_in_blocks( array( array( 'blockName' => 'sgs/account', 'attrs' => array(), 'innerBlocks' => array() ) ) ), '7 a block without the setting finds nothing' );
ok( '' === RD::destination_in_blocks( array( array( 'blockName' => 'core/template-part', 'attrs' => array( 'slug' => 'x' ), 'innerBlocks' => array() ) ) ), '7 limit: a template part is not searched' );

// 8) Signed-out visitor on the bare account page goes to the sign-in page.
$so = array( 'logged_in' => false, 'method' => 'GET', 'request_url' => '/my-account/', 'sign_in_url' => 'https://example.test/sign-in/' );
ok( 'https://example.test/sign-in/?redirect_to=' . rawurlencode( 'https://example.test/my-account/' ) === RD::decide_signed_out( $so ), '8 signed out on the account page: sign-in page, redirect_to kept' );
ok( null === RD::decide_signed_out( array( 'logged_in' => true ) + $so ), '8 signed in: no redirect' );
ok( null === RD::decide_signed_out( array( 'sign_in_url' => '' ) + $so ), '8 no separate sign-in page set: no redirect' );
ok( null === RD::decide_signed_out( array( 'request_url' => '/sign-in/' ) + $so ), '8 already on the sign-in page: no loop' );
foreach ( array( 'is_rest', 'is_ajax', 'is_cron', 'is_admin', 'is_preview', 'has_endpoint', 'has_key' ) as $flag ) {
	ok( null === RD::decide_signed_out( array( $flag => true ) + $so ), "8 {$flag}: no redirect" );
}
ok( null === RD::decide_signed_out( array( 'method' => 'POST' ) + $so ), '8 a POST: no redirect' );
ok( 'https://example.test/sign-in/?a=1&redirect_to=' . rawurlencode( 'https://example.test/my-account/' ) === RD::decide_signed_out( array( 'sign_in_url' => 'https://example.test/sign-in/?a=1' ) + $so ), '8 sign-in address with a query: redirect_to appended' );
ok( 'https://example.test/sign-in/?redirect_to=' . rawurlencode( 'https://example.test/my-account/?x=1' ) === RD::decide_signed_out( array( 'request_url' => '/my-account/?x=1' ) + $so ), '8 the visitor query comes back through redirect_to' );
$GLOBALS['sgs_test_home'] = 'https://example.test/shop';
ok( 'https://example.test/shop/sign-in/?redirect_to=' . rawurlencode( 'https://example.test/shop/my-account/' ) === RD::decide_signed_out( array( 'request_url' => '/shop/my-account/', 'sign_in_url' => 'https://example.test/shop/sign-in/' ) + $so ), '8 a site in a subdirectory: the folder appears once in redirect_to' );
unset( $GLOBALS['sgs_test_home'] );

// 9) Finding the sign-in page in parsed blocks: only a card-view block with a sign-in address counts.
$blk = static fn( array $a ) => array( array( 'blockName' => 'sgs/account', 'attrs' => $a, 'innerBlocks' => array() ) );
ok( 'https://example.test/sign-in/' === RD::sign_in_url_in_blocks( $blk( array( 'signedOutView' => 'card', 'signedOutSignInUrl' => '/sign-in/' ) ) ), '9 card view with a typed address: found and made absolute' );
ok( '' === RD::sign_in_url_in_blocks( $blk( array( 'signedOutView' => 'card' ) ) ), '9 card view with no address: none' );
ok( '' === RD::sign_in_url_in_blocks( $blk( array( 'signedOutSignInUrl' => '/sign-in/' ) ) ), '9 not the card view: none' );

echo $failures ? "\n{$failures} FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
