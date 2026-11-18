<?php
/**
 * Standalone test: an icon inside sgs/account's sign-in and create-account buttons
 * (includes/account/helpers-account-button-icon.php).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-button-icon-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
function __( $t, $d = null ) { return $t; }
function esc_html__( $t, $d = null ) { return $t; }
require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'sgs_object_attr_keys' ) ) {
	function sgs_object_attr_keys( $block ) { return array(); }
}
require dirname( __DIR__, 2 ) . '/includes/account/helpers-account-button-icon.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

$login    = '<form class="woocommerce-form woocommerce-form-login login"><button type="submit" class="woocommerce-button button woocommerce-form-login__submit" name="login" value="Log in">Log in</button></form>';
$register = '<form class="woocommerce-form-register register"><button type="submit" class="woocommerce-Button woocommerce-button button woocommerce-form-register__submit" name="register" value="Register">Register</button></form>';
$html     = $login . $register;

// 1) No icon set: markup unchanged, no CSS.
ok( $html === sgs_account_button_icons( $html, array() ), '1 default: markup unchanged' );
ok( '' === sgs_account_button_icon_css( array(), '.root' ), '1 default: no CSS' );

// 2) Sign-in icon after the label by default; the register button is untouched.
$out = sgs_account_button_icons( $html, array( 'loginButtonIcon' => 'arrow-right' ) );
ok( 1 === preg_match( '#<button[^>]*woocommerce-form-login__submit sgs-account__button--icon"[^>]*>Log in<span class="sgs-account__button-icon" aria-hidden="true">(?:<!--.*?-->)?<svg#s', $out ), '2 sign-in: icon inside the button, after the label, aria-hidden' );
ok( str_contains( $out, '>Register</button>' ) && 1 === substr_count( $out, 'sgs-account__button-icon"' ), '2 sign-in: the register button is unchanged' );
ok( str_contains( $out, 'type="submit"' ) && str_contains( $out, 'name="login"' ), '2 sign-in: form attributes kept' );

// 3) Before the label, and the circle modifier.
$out = sgs_account_button_icons( $login, array( 'loginButtonIcon' => 'arrow-right', 'loginButtonIconPosition' => 'before', 'loginButtonIconBackground' => 'primary' ) );
ok( 1 === preg_match( '#<button[^>]*><span class="sgs-account__button-icon sgs-account__button-icon--circle" aria-hidden="true">(?:<!--.*?-->)?<svg.*</svg></span>Log in</button>#s', $out ), '3 sign-in: before the label, with the circle modifier' );

// 4) Register button likewise.
$out = sgs_account_button_icons( $html, array( 'registerButtonIcon' => 'arrow-right' ) );
ok( 1 === preg_match( '#woocommerce-form-register__submit sgs-account__button--icon"[^>]*>Register<span class="sgs-account__button-icon[^"]*" aria-hidden="true">(?:<!--.*?-->)?<svg#s', $out ) && str_contains( $out, '>Log in</button>' ), '4 register: icon after the label; sign-in unchanged' );

// 5) An unknown icon name or a hostile one draws nothing.
ok( $html === sgs_account_button_icons( $html, array( 'loginButtonIcon' => 'no-such-icon-zzz', 'registerButtonIcon' => '<script>' ) ), '5 unknown icon name: markup unchanged' );

// 6) CSS: gap, size, colour and circle fill print on the right selectors; the other button prints nothing.
$css = sgs_account_button_icon_css(
	array(
		'loginButtonIcon'           => 'arrow-right',
		'loginButtonIconGap'        => array( 'desktop' => '10' ),
		'loginButtonIconSize'       => array( 'desktop' => 18 ),
		'loginButtonIconColour'     => 'accent',
		'loginButtonIconBackground' => 'primary',
	),
	'.root'
);
ok( str_contains( $css, '.root .sgs-account__wc form .woocommerce-form-login__submit{' ) && str_contains( $css, 'gap:10px' ) && str_contains( $css, '--sgs-btn-icon-size:18px' ), '6 css: gap and size on the button' );
ok( str_contains( $css, 'woocommerce-form-login__submit .sgs-account__button-icon' ) && str_contains( $css, 'var(--wp--preset--color--accent' ) && str_contains( $css, 'var(--wp--preset--color--primary' ), '6 css: icon colour and circle fill on the icon' );
ok( ! str_contains( $css, 'woocommerce-form-register__submit' ), '6 css: nothing for a button without an icon' );

echo $failures ? "\n$failures FAILED\n" : "\nAll passed\n";
exit( $failures ? 1 : 0 );
