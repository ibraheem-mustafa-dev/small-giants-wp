<?php
/**
 * Standalone runner for `SGS\Blocks\Mail\Sgs_Mailer::send()`, `::owner_recipient()`
 * and `SGS\Blocks\Mail\Sgs_Mail_Template::wrap()` (Spec 04, unified-email plan phase 2).
 *
 * Exercises the REAL classes (required directly, not copied) against fake WP
 * function stubs — the same shape as `run-wishlist-alerts-standalone.php` and
 * the rest of this directory. Covers:
 *   - HTML body plus text AltBody set via a `phpmailer_init` hook that is
 *     added immediately before `wp_mail()` and removed immediately after, so
 *     a second send without a text body does not reuse the old AltBody;
 *   - Reply-To header present only when the address sanitises to something
 *     valid, absent otherwise;
 *   - header injection refused: a CRLF-bearing `$to` returns false and never
 *     reaches `wp_mail()`; a CRLF-bearing subject is flattened; a CRLF-bearing
 *     reply-to yields no Reply-To header;
 *   - NEGATIVE CONTROL: the same injection checker run against a deliberately
 *     naive sender that passes `$to` straight to `wp_mail()` — proving the
 *     checker can actually go red;
 *   - Sgs_Mail_Template::wrap(): the non-WooCommerce path (heading, site name,
 *     body and fallback colours all present) and the WooCommerce path
 *     (stubbed WC()/WC_Email/wc_get_template — header, body, footer order and
 *     style_inline() called);
 *   - Sgs_Mailer::owner_recipient()'s fallback chain: preferred -> Site Info
 *     email -> admin_email.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-mailer-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// -- WordPress core function/class stubs -------------------------------------

$GLOBALS['sgs_test_options']       = array();
$GLOBALS['sgs_test_hooks']         = array();
$GLOBALS['sgs_test_wp_mail_calls'] = array();
$GLOBALS['sgs_test_theme_palette'] = array(
	array(
		'slug'  => 'text',
		'name'  => 'Text',
		'color' => '#112233',
	),
	array(
		'slug'  => 'surface',
		'name'  => 'Surface',
		'color' => '#f5f5f5',
	),
	array(
		'slug'  => 'primary',
		'name'  => 'Primary',
		'color' => '#0a84ff',
	),
);
$GLOBALS['sgs_test_site_info']     = array();

function sanitize_email( $email ) {
	$email = trim( (string) $email );
	if ( '' === $email || false !== strpbrk( $email, "\r\n\t " ) ) {
		return '';
	}
	return false !== filter_var( $email, FILTER_VALIDATE_EMAIL ) ? $email : '';
}

function is_email( $email ) {
	return false !== filter_var( (string) $email, FILTER_VALIDATE_EMAIL ) ? $email : false;
}

function get_option( $key, $default = false ) {
	return $GLOBALS['sgs_test_options'][ $key ] ?? $default;
}

function get_bloginfo( $show = '' ) {
	return 'name' === $show ? 'Test Site' : '';
}

function home_url() {
	return 'https://example.test';
}

function wp_get_global_settings( array $path = array() ) {
	if ( array( 'color', 'palette', 'theme' ) === $path ) {
		return $GLOBALS['sgs_test_theme_palette'];
	}
	return array();
}

function esc_html( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES );
}

function esc_attr( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES );
}

function esc_url( $url ) {
	return (string) filter_var( (string) $url, FILTER_SANITIZE_URL );
}

// -- Hook registry (real behaviour, not a no-op stub — the AltBody proof needs it) --

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	$GLOBALS['sgs_test_hooks'][ $hook ][] = $callback;
}

function remove_action( $hook, $callback, $priority = 10 ) {
	if ( empty( $GLOBALS['sgs_test_hooks'][ $hook ] ) ) {
		return;
	}
	foreach ( $GLOBALS['sgs_test_hooks'][ $hook ] as $index => $registered ) {
		if ( $registered === $callback ) {
			unset( $GLOBALS['sgs_test_hooks'][ $hook ][ $index ] );
		}
	}
}

function do_action( $hook, ...$args ) {
	foreach ( $GLOBALS['sgs_test_hooks'][ $hook ] ?? array() as $callback ) {
		\call_user_func_array( $callback, $args );
	}
}

/**
 * Fake PHPMailer — just enough surface for the AltBody assertion.
 */
class Sgs_Test_Fake_Phpmailer {
	public $AltBody = null; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- PHPMailer's real property name.
}

/**
 * `wp_mail()` stub: records the call and fires `phpmailer_init` against a
 * fresh fake PHPMailer instance, exactly like the real function does before
 * it hands the message to PHPMailer.
 */
function wp_mail( $to, $subject, $message, $headers = array(), $attachments = array() ) {
	$phpmailer = new Sgs_Test_Fake_Phpmailer();
	do_action( 'phpmailer_init', $phpmailer );

	$GLOBALS['sgs_test_wp_mail_calls'][] = array(
		'to'          => $to,
		'subject'     => $subject,
		'message'     => $message,
		'headers'     => $headers,
		'attachments' => $attachments,
		'alt_body'    => $phpmailer->AltBody,
	);

	return true;
}

} // end namespace { (global stubs)

// -- Minimal fake Sgs_Site_Info (owner_recipient()'s fallback source) --------
// Not the real class: the real one needs a much larger WP stub surface
// (current_user_can, update_option, wp_kses, add_filter, …) that this test
// doesn't otherwise exercise. This fake matches the one method Sgs_Mailer calls.

namespace SGS\Blocks {
	final class Sgs_Site_Info {
		public static function get( string $key, $fallback = '' ) {
			return $GLOBALS['sgs_test_site_info'][ $key ] ?? $fallback;
		}
	}
}

namespace {

require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-mail-template.php';
require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-mailer.php';

use SGS\Blocks\Mail\Sgs_Mailer;
use SGS\Blocks\Mail\Sgs_Mail_Template;

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}

function reset_wp_mail_log(): void {
	$GLOBALS['sgs_test_wp_mail_calls'] = array();
}

function last_wp_mail_call(): ?array {
	$log = $GLOBALS['sgs_test_wp_mail_calls'];
	return empty( $log ) ? null : end( $log );
}

// -- (a) HTML body + text AltBody, and the AltBody hook is scoped to one send --

reset_wp_mail_log();
$sent1 = Sgs_Mailer::send( 'customer@example.com', 'Order update', 'Your order', '<p>HTML body</p>', 'Plain text body', array() );
$call1 = last_wp_mail_call();
ok( true === $sent1 && null !== $call1, 'a normal send reaches wp_mail() and reports success' );
ok( null !== $call1 && 'Plain text body' === $call1['alt_body'], 'the text body becomes phpmailer AltBody for that send' );
ok( null !== $call1 && false !== strpos( $call1['message'], 'HTML body' ), 'the HTML body is present in the wrapped message' );
ok( empty( $GLOBALS['sgs_test_hooks']['phpmailer_init'] ?? array() ), 'the AltBody hook is removed again after the send' );

// A second send with NO text body must not reuse the first AltBody.
reset_wp_mail_log();
Sgs_Mailer::send( 'customer@example.com', 'Order update 2', 'Your order', '<p>HTML only</p>', '', array() );
$call2 = last_wp_mail_call();
ok( null !== $call2 && '' === $call2['alt_body'], 'a second send with no text body does not reuse the previous AltBody' );

// -- (b) Reply-To present when valid, absent when invalid ------------------

reset_wp_mail_log();
Sgs_Mailer::send( 'customer@example.com', 'Subject', 'Heading', '<p>Body</p>', 'Body', array( 'reply_to' => 'owner@example.com' ) );
$call3 = last_wp_mail_call();
ok( null !== $call3 && in_array( 'Reply-To: owner@example.com', $call3['headers'], true ), 'a valid reply_to produces a Reply-To header' );

reset_wp_mail_log();
Sgs_Mailer::send( 'customer@example.com', 'Subject', 'Heading', '<p>Body</p>', 'Body', array( 'reply_to' => 'not-an-email' ) );
$call4          = last_wp_mail_call();
$has_reply_to_4 = null !== $call4 && (bool) preg_grep( '/^Reply-To:/', $call4['headers'] );
ok( null !== $call4 && ! $has_reply_to_4, 'an invalid reply_to produces no Reply-To header' );

reset_wp_mail_log();
Sgs_Mailer::send(
	'customer@example.com',
	'Subject',
	'Heading',
	'<p>Body</p>',
	'Body',
	array(
		'reply_to'      => 'owner@example.com',
		'reply_to_name' => 'Store <Owner>, "quoted"',
	)
);
$call5 = last_wp_mail_call();
$reply_header_5 = null !== $call5 ? ( preg_grep( '/^Reply-To:/', $call5['headers'] )[ array_key_first( preg_grep( '/^Reply-To:/', $call5['headers'] ) ?: array() ) ] ?? '' ) : '';
ok(
	'Reply-To: Store Owner quoted <owner@example.com>' === $reply_header_5,
	'reply_to_name has <>",  stripped before it reaches the header'
);

// -- (c) Header injection refused -------------------------------------------

reset_wp_mail_log();
$malicious_to = "a@b.com\r\nBcc: x@y.com";
$sent_bad_to  = Sgs_Mailer::send( $malicious_to, 'Subject', 'Heading', '<p>Body</p>', 'Body', array() );
ok( false === $sent_bad_to, 'a CRLF-bearing $to returns false' );
ok( null === last_wp_mail_call(), 'a CRLF-bearing $to never reaches wp_mail()' );

reset_wp_mail_log();
Sgs_Mailer::send( 'customer@example.com', "Subject\r\nBcc: x@y.com", 'Heading', '<p>Body</p>', 'Body', array() );
$call6 = last_wp_mail_call();
ok( null !== $call6 && false === strpos( $call6['subject'], "\r" ) && false === strpos( $call6['subject'], "\n" ), 'a CRLF-bearing subject is flattened before it reaches wp_mail()' );

reset_wp_mail_log();
Sgs_Mailer::send( 'customer@example.com', 'Subject', 'Heading', '<p>Body</p>', 'Body', array( 'reply_to' => "owner@example.com\r\nBcc: x@y.com" ) );
$call7          = last_wp_mail_call();
$has_reply_to_7 = null !== $call7 && (bool) preg_grep( '/^Reply-To:/', $call7['headers'] );
ok( null !== $call7 && ! $has_reply_to_7, 'a CRLF-bearing reply_to yields no Reply-To header' );

// -- (d) NEGATIVE CONTROL: run the same checker against a naive sender ------

/**
 * A deliberately naive sender that passes $to straight to wp_mail(), with
 * none of Sgs_Mailer's guards — proves the injection checker can go red.
 */
function naive_send_no_guards( string $to, string $subject, string $body ): bool {
	return wp_mail( $to, $subject, $body );
}

/**
 * The shared injection checker: sends a CRLF-bearing $to through the given
 * callable and reports whether wp_mail() was actually invoked (true = the
 * sender is vulnerable to header injection).
 */
function sender_is_vulnerable_to_crlf_to( callable $send ): bool {
	reset_wp_mail_log();
	$send( "victim@example.com\r\nBcc: attacker@example.com" );
	return null !== last_wp_mail_call();
}

$real_vulnerable  = sender_is_vulnerable_to_crlf_to(
	static fn( string $to ) => Sgs_Mailer::send( $to, 'Subject', 'Heading', '<p>Body</p>', 'Body', array() )
);
$naive_vulnerable = sender_is_vulnerable_to_crlf_to(
	static fn( string $to ) => naive_send_no_guards( $to, 'Subject', '<p>Body</p>' )
);

ok( false === $real_vulnerable, 'the real Sgs_Mailer::send() is not vulnerable to a CRLF $to' );
ok( true === $naive_vulnerable, 'NEGATIVE CONTROL: the naive sender IS vulnerable to a CRLF $to (proves the checker can fail)' );

// -- (e) Template: non-WooCommerce path -------------------------------------

$native = Sgs_Mail_Template::wrap( 'Welcome', '<p>Native body</p>' );
ok( false !== strpos( $native, 'Welcome' ), 'the non-WooCommerce template contains the heading' );
ok( false !== strpos( $native, 'Test Site' ), 'the non-WooCommerce template contains the site name' );
ok( false !== strpos( $native, 'Native body' ), 'the non-WooCommerce template contains the body' );
ok( false !== strpos( $native, '#112233' ) && false !== strpos( $native, '#f5f5f5' ) && false !== strpos( $native, '#0a84ff' ), 'the non-WooCommerce template uses the resolved theme palette colours' );

// Fallback colours: an empty palette must fall back to the documented neutrals.
$GLOBALS['sgs_test_theme_palette'] = array();
$native_fallback                   = Sgs_Mail_Template::wrap( 'Welcome', '<p>Native body</p>' );
ok(
	false !== strpos( $native_fallback, '#1a1a1a' ) && false !== strpos( $native_fallback, '#ffffff' ),
	'an empty theme palette falls back to the documented neutral colours'
);
$GLOBALS['sgs_test_theme_palette'] = array(
	array(
		'slug'  => 'text',
		'name'  => 'Text',
		'color' => '#112233',
	),
	array(
		'slug'  => 'surface',
		'name'  => 'Surface',
		'color' => '#f5f5f5',
	),
	array(
		'slug'  => 'primary',
		'name'  => 'Primary',
		'color' => '#0a84ff',
	),
);

// -- (e) Template: WooCommerce path (stubbed WC()/WC_Email/wc_get_template) --

$GLOBALS['sgs_test_wc_style_inline_called'] = false;

// Declared conditionally (not as unconditional top-level declarations) so PHP
// does NOT hoist them at compile time — function_exists('WC') must stay false
// for every assertion above this point, proving the non-WooCommerce path ran
// where it was meant to.
if ( ! function_exists( 'WC' ) ) {
	function WC() { // phpcs:ignore WordPress.NamingConventions.ValidFunctionName.FunctionNameInvalid, PSR1.Methods.CamelCapsMethodName.NotCamelCaps -- matches WooCommerce's own global WC() accessor.
		return true;
	}
}

if ( ! class_exists( 'WC_Email' ) ) {
	class WC_Email {
		public function get_content_type() {
			return 'text/html';
		}

		public function style_inline( $content ) {
			$GLOBALS['sgs_test_wc_style_inline_called'] = true;
			return $content . '<!--styled-->';
		}
	}
}

if ( ! function_exists( 'wc_get_template' ) ) {
	function wc_get_template( $template_name, $args = array() ) {
		if ( 'emails/email-header.php' === $template_name ) {
			echo '<!--HEADER:' . esc_html( $args['email_heading'] ?? '' ) . '-->';
		} elseif ( 'emails/email-footer.php' === $template_name ) {
			echo '<!--FOOTER-->';
		}
	}
}

$wc_wrapped     = Sgs_Mail_Template::wrap( 'WC Heading', '<p>WC body</p>' );
$header_pos     = strpos( $wc_wrapped, '<!--HEADER:WC Heading-->' );
$body_pos       = strpos( $wc_wrapped, 'WC body' );
$footer_pos     = strpos( $wc_wrapped, '<!--FOOTER-->' );

ok( false !== $header_pos && false !== $body_pos && false !== $footer_pos, 'the WooCommerce path renders header, body and footer' );
ok( $header_pos < $body_pos && $body_pos < $footer_pos, 'the WooCommerce path renders header, body and footer IN ORDER' );
ok( false !== strpos( $wc_wrapped, '<!--styled-->' ), 'the WooCommerce path result carries style_inline()\'s marker' );
ok( true === $GLOBALS['sgs_test_wc_style_inline_called'], 'the WooCommerce path calls WC_Email::style_inline()' );

// -- (f) owner_recipient() fallback chain -----------------------------------

$GLOBALS['sgs_test_site_info'] = array( 'email' => 'siteinfo@example.com' );
$GLOBALS['sgs_test_options']   = array( 'admin_email' => 'admin@example.com' );

ok( 'preferred@example.com' === Sgs_Mailer::owner_recipient( 'preferred@example.com' ), 'owner_recipient() uses a valid preferred address first' );
ok( 'siteinfo@example.com' === Sgs_Mailer::owner_recipient( '' ), 'owner_recipient() falls back to the Site Info email when no preferred address is given' );
ok( 'siteinfo@example.com' === Sgs_Mailer::owner_recipient( 'not-an-email' ), 'owner_recipient() falls back to the Site Info email when the preferred address is invalid' );

$GLOBALS['sgs_test_site_info'] = array();
ok( 'admin@example.com' === Sgs_Mailer::owner_recipient( '' ), 'owner_recipient() falls back to admin_email when Site Info has no email' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );

}
