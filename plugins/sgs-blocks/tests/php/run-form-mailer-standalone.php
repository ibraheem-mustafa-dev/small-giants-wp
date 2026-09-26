<?php
/**
 * Standalone runner for `SGS\Blocks\Forms\Form_Mailer::send_notifications()`
 * (Spec 04, unified-email plan phase 4).
 *
 * Exercises the REAL classes (`Form_Mailer`, `Sgs_Mailer`, `Sgs_Mail_Template`
 * — required directly, not copied) against fake WP function stubs, the same
 * shape as `run-mailer-standalone.php` and `run-choice-flow-submit-standalone.php`
 * in this directory. Covers:
 *   - owner mail recipient fallback: blank `notifyEmail` falls back through
 *     `Sgs_Mailer::owner_recipient()` to `admin_email` (Site Info is not
 *     stubbed here — that fallback chain is already proven end-to-end in
 *     run-mailer-standalone.php);
 *   - Reply-To is set from the submitter's own valid email field;
 *   - the confirmation email is sent only when `confirmationEmail` is true
 *     AND a valid submitter email is present — never otherwise;
 *   - every field value in the owner notification's HTML table is escaped
 *     (a `<script>` injected into a field value never reaches the message
 *     unescaped);
 *   - NEGATIVE CONTROL: a submitted email "attacker@example.com\r\n" (a raw
 *     CR/LF-bearing value) produces no confirmation email and no Reply-To
 *     header on the owner notification — and a deliberately naive extractor
 *     that sanitises BEFORE checking the raw value for CR/LF is shown to
 *     "rescue" that same payload into a usable address, proving the
 *     assertion can actually go red.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-form-mailer-standalone.php
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

$GLOBALS['sgs_test_options']       = array( 'admin_email' => 'owner@example.com' );
$GLOBALS['sgs_test_hooks']         = array();
$GLOBALS['sgs_test_wp_mail_calls'] = array();
$GLOBALS['sgs_test_theme_palette'] = array();

/**
 * Deliberately more realistic than run-mailer-standalone.php's reject-on-any-
 * CRLF stub: strips CR/LF/tab/space (mirroring how a real sanitiser removes
 * disallowed characters) rather than refusing the whole string outright. This
 * is what makes the "rescue" negative control below meaningful — a stub that
 * simply rejected on sight of \r\n would hide the bug this test exists to
 * catch (Form_Mailer must check the RAW value for CR/LF itself, never trust
 * that sanitize_email() already removed something dangerous).
 */
function sanitize_email( $email ) {
	$email = preg_replace( '/[\r\n\t ]/', '', (string) $email );
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
	return $GLOBALS['sgs_test_theme_palette'];
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

function __( $text ) {
	return $text;
}

/** Minimal stand-in: wraps non-empty lines in <p>, already-escaped input in. */
function wpautop( $text ) {
	$text = trim( (string) $text );
	return '' === $text ? '' : '<p>' . $text . '</p>';
}

// -- Hook registry (real behaviour — the AltBody proof needs it) ------------

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

class Sgs_Test_Fake_Phpmailer {
	public $AltBody = null; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- PHPMailer's real property name.
}

function wp_mail( $to, $subject, $message, $headers = array(), $attachments = array() ) {
	$phpmailer = new Sgs_Test_Fake_Phpmailer();
	do_action( 'phpmailer_init', $phpmailer );

	$GLOBALS['sgs_test_wp_mail_calls'][] = array(
		'to'      => $to,
		'subject' => $subject,
		'message' => $message,
		'headers' => $headers,
	);

	return true;
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $key ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
	}
}

} // end namespace { (global stubs)

namespace {

require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-mail-template.php';
require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-mailer.php';
require dirname( __DIR__, 2 ) . '/includes/forms/class-form-mailer.php';
require dirname( __DIR__, 2 ) . '/includes/forms/class-form-processor.php';

use SGS\Blocks\Forms\Form_Mailer;

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

function mail_calls(): array {
	return $GLOBALS['sgs_test_wp_mail_calls'];
}

function reply_to_of( array $call ): string {
	foreach ( $call['headers'] as $header ) {
		if ( 0 === strpos( $header, 'Reply-To:' ) ) {
			return trim( substr( $header, strlen( 'Reply-To:' ) ) );
		}
	}
	return '';
}

// -- (a) owner notification: blank notifyEmail falls back to admin_email ---

reset_wp_mail_log();
Form_Mailer::send_notifications(
	'contact-us',
	'Contact Us',
	array(
		'name'  => 'Priya Sharma',
		'email' => 'priya@example.com',
	),
	array()
);
$calls = mail_calls();
ok( 1 === count( $calls ), 'no confirmation requested — exactly one mail sent (the owner notification)' );
ok( 1 === count( $calls ) && 'owner@example.com' === $calls[0]['to'], 'blank notifyEmail falls back to admin_email' );
ok( 1 === count( $calls ) && false !== strpos( $calls[0]['subject'], 'Contact Us' ), 'the owner subject names the form' );
ok( 1 === count( $calls ) && 'priya@example.com' === reply_to_of( $calls[0] ), "the owner notification's Reply-To is the submitter's own email" );

// -- (b) confirmation sent only when enabled AND a valid email is present --

reset_wp_mail_log();
Form_Mailer::send_notifications(
	'contact-us',
	'Contact Us',
	array( 'name' => 'No Email Here' ),
	array( 'confirmationEmail' => true )
);
ok( 1 === count( mail_calls() ), 'confirmationEmail true but no email field present — still only the owner mail' );

reset_wp_mail_log();
Form_Mailer::send_notifications(
	'contact-us',
	'Contact Us',
	array( 'email' => 'priya@example.com' ),
	array( 'confirmationEmail' => false )
);
ok( 1 === count( mail_calls() ), 'a valid email present but confirmationEmail false — still only the owner mail' );

reset_wp_mail_log();
Form_Mailer::send_notifications(
	'contact-us',
	'Contact Us',
	array( 'email' => 'priya@example.com' ),
	array(
		'confirmationEmail'   => true,
		'confirmationSubject' => 'Thanks Priya',
		'confirmationMessage' => 'We got your message.',
	)
);
$calls = mail_calls();
ok( 2 === count( $calls ), 'confirmationEmail true + valid email — both the owner mail and the confirmation are sent' );
$confirmation = null;
foreach ( $calls as $call ) {
	if ( 'priya@example.com' === $call['to'] ) {
		$confirmation = $call;
	}
}
ok( null !== $confirmation && 'Thanks Priya' === $confirmation['subject'], 'the confirmation uses the configured subject' );
ok( null !== $confirmation && false !== strpos( $confirmation['message'], 'We got your message.' ), 'the confirmation uses the configured message' );

// -- (c) every field value is escaped in the owner notification ------------

reset_wp_mail_log();
Form_Mailer::send_notifications(
	'contact-us',
	'Contact Us',
	array(
		'name'    => '<script>alert(1)</script>',
		'message' => 'hello',
	),
	array()
);
$owner_message = mail_calls()[0]['message'] ?? '';
ok( false === strpos( $owner_message, '<script>alert(1)</script>' ), 'a raw <script> field value never reaches the message unescaped' );
ok( false !== strpos( $owner_message, '&lt;script&gt;' ), 'the same field value is present, HTML-escaped' );

// -- (d) NEGATIVE CONTROL: a CR/LF-bearing email is refused, and the checker can go red --

reset_wp_mail_log();
Form_Mailer::send_notifications(
	'contact-us',
	'Contact Us',
	array( 'email' => "attacker@example.com\r\n" ),
	array( 'confirmationEmail' => true )
);
$calls = mail_calls();
ok( 1 === count( $calls ), 'a CR/LF-bearing email sends only the owner mail — no confirmation' );
ok( 1 === count( $calls ) && '' === reply_to_of( $calls[0] ), 'a CR/LF-bearing email never becomes the owner notification Reply-To' );

/**
 * A deliberately naive extractor that sanitises BEFORE checking the raw
 * value for CR/LF — the exact ordering bug Form_Mailer::extract_submitter_email()
 * must avoid. Mirrors this file's own sanitize_email() stub, which strips
 * disallowed characters rather than rejecting the whole string — so a
 * trailing "\r\n" is silently stripped and the sanitised remainder is
 * accepted as if it had always been clean.
 */
function naive_extract_submitter_email( array $fields ): string {
	foreach ( $fields as $key => $value ) {
		if ( is_string( $key ) && false !== strpos( $key, 'email' ) && is_scalar( $value ) ) {
			$sanitised = sanitize_email( (string) $value );
			if ( '' !== $sanitised && is_email( $sanitised ) ) {
				return $sanitised;
			}
		}
	}
	return '';
}

$crlf_payload = array( 'email' => "attacker@example.com\r\n" );

// The real path already refused this exact payload above (0 confirmation
// mails, no Reply-To). The naive extractor, checked directly against the
// same payload, "rescues" it into a usable address — proving this negative
// control can actually fail, not just pass by construction.
$naive_result = naive_extract_submitter_email( $crlf_payload );
ok(
	'attacker@example.com' === $naive_result,
	'NEGATIVE CONTROL: the naive sanitise-then-check extractor RESCUES the CR/LF-bearing payload into a usable address (proves the checker can fail)'
);

// The REAL upstream sanitiser: an email-named field holding a line break is
// blanked, never "repaired". Core's sanitize_email() rebuilds
// "a@b.com\nBcc: x@y.com" as the valid-looking "a@b.comBccxy.com" (proved on
// sandybrown with WP-CLI), and this file's stub rebuilds the trailing-CRLF
// payload as "attacker@example.com", so against the pre-fix processor (plain
// sanitize_email()) this assertion goes red: it is its own negative control.
$sanitise = new ReflectionMethod( \SGS\Blocks\Forms\Form_Processor::class, 'sanitise_fields' );
$sanitise->setAccessible( true );
$cleaned = $sanitise->invoke( null, array( 'email' => "attacker@example.com\r\n", 'your_email' => "a@b.com\nBcc: x@y.com", 'contact_email' => 'ok@example.com' ) );
ok( '' === $cleaned['email'] && '' === $cleaned['your_email'], 'Form_Processor::sanitise_fields blanks every email field holding a line break' );
ok( 'ok@example.com' === $cleaned['contact_email'], 'Form_Processor::sanitise_fields keeps a clean email field (positive control)' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );

}
