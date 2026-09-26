<?php
/**
 * Standalone runner for `SGS\ClientNotes\API\Notes_Mailer::notify()` (Spec 04,
 * unified-email plan Phase 5).
 *
 * Exercises the REAL class (required directly, not copied) against fake WP
 * function stubs — the same shape as
 * `plugins/sgs-blocks/tests/php/run-mailer-standalone.php`. Covers:
 *   - `created` and `resolved` events mail the notification-address option;
 *   - an empty notification-address option sends nothing;
 *   - the `Sgs_Mailer` path is used when `\SGS\Blocks\Mail\Sgs_Mailer` exists,
 *     and the plain `wp_mail()` fallback is used when it does not (checked in
 *     that order, since PHP classes cannot be un-declared once defined);
 *   - note text containing `<script>` is escaped in both the HTML and text
 *     bodies;
 *   - a notification address containing "\r\nBcc:" sends nothing;
 *   - NEGATIVE CONTROL: the same injection checker run against a naive
 *     variant that skips the CRLF guard, proving the assertion can go red.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-client-notes/tests/run-notes-mailer-standalone.php
 *
 * @package SGS\ClientNotes\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );
}

// -- WordPress core function/class stubs -------------------------------------

$GLOBALS['sgs_test_options']       = array();
$GLOBALS['sgs_test_posts']         = array();
$GLOBALS['sgs_test_users']         = array();
$GLOBALS['sgs_test_wp_mail_calls'] = array();

function get_option( $key, $default = false ) {
	return $GLOBALS['sgs_test_options'][ $key ] ?? $default;
}

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

class Sgs_Test_Post {
	public $post_title = '';
}

function get_post( $post_id ) {
	return $GLOBALS['sgs_test_posts'][ $post_id ] ?? null;
}

function get_permalink( $post ) {
	return 'https://example.test/page/';
}

class Sgs_Test_User {
	public $display_name = '';
}

function get_userdata( $user_id ) {
	return $GLOBALS['sgs_test_users'][ $user_id ] ?? false;
}

function get_bloginfo( $show = '' ) {
	return 'name' === $show ? 'Test Site' : '';
}

function wp_specialchars_decode( $text, $quote_style = ENT_NOQUOTES ) {
	return htmlspecialchars_decode( (string) $text, $quote_style );
}

function admin_url( $path = '' ) {
	return 'https://example.test/wp-admin/' . $path;
}

function __( $text, $domain = 'default' ) {
	return $text;
}

function esc_html__( $text, $domain = 'default' ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES );
}

function esc_html( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES );
}

function esc_url( $url ) {
	return (string) filter_var( (string) $url, FILTER_SANITIZE_URL );
}

function wpautop( $text ) {
	$text = trim( (string) $text );
	return '' === $text ? '' : '<p>' . $text . "</p>\n";
}

function wp_strip_all_tags( $text ) {
	return trim( strip_tags( (string) $text ) );
}

function wp_mail( $to, $subject, $message, $headers = array(), $attachments = array() ) {
	$GLOBALS['sgs_test_wp_mail_calls'][] = array(
		'to'      => $to,
		'subject' => $subject,
		'message' => $message,
	);
	return true;
}

} // end namespace { (global stubs)

// -- Fake Sgs_Mailer (declared only when sgs_test_define_fake_sgs_mailer() is
// called, further down, AFTER the wp_mail()-fallback assertions have already
// run — a conditionally-declared class is not hoisted at compile time, so
// class_exists( '\SGS\Blocks\Mail\Sgs_Mailer' ) stays false until then). --

namespace SGS\Blocks\Mail {

	function sgs_test_define_fake_sgs_mailer_impl() {
		if ( class_exists( __NAMESPACE__ . '\\Sgs_Mailer' ) ) {
			return;
		}

		/**
		 * Records the call instead of sending mail — just enough surface to
		 * prove Notes_Mailer routes through this class when it is active.
		 */
		final class Sgs_Mailer {
			public static function send( string $to, string $subject, string $heading, string $html_body, string $text_body, array $args = array() ): bool {
				$GLOBALS['sgs_test_sgs_mailer_calls'][] = array(
					'to'        => $to,
					'subject'   => $subject,
					'heading'   => $heading,
					'html_body' => $html_body,
					'text_body' => $text_body,
				);
				return true;
			}
		}
	}

}

namespace {

/**
 * Public trigger, called from the main test body once the earlier fallback
 * assertions are done.
 */
function sgs_test_define_fake_sgs_mailer(): void {
	\SGS\Blocks\Mail\sgs_test_define_fake_sgs_mailer_impl();
}

require dirname( __DIR__ ) . '/includes/api/class-notes-mailer.php';

use SGS\ClientNotes\API\Notes_Mailer;

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

function make_note( array $overrides = array() ): array {
	return array_merge(
		array(
			'id'          => 1,
			'post_id'     => 42,
			'user_id'     => 5,
			'comment'     => 'A perfectly normal note.',
			'priority'    => 'normal',
			'status'      => 'open',
			'page_url'    => 'https://example.test/some-page/',
			'resolved_by' => 0,
			'resolved_at' => null,
		),
		$overrides
	);
}

$GLOBALS['sgs_test_posts'][42] = new Sgs_Test_Post();
$GLOBALS['sgs_test_posts'][42]->post_title = 'Homepage';

$author = new Sgs_Test_User();
$author->display_name = 'Ada Author';
$GLOBALS['sgs_test_users'][5] = $author;

$resolver = new Sgs_Test_User();
$resolver->display_name = 'Rita Resolver';
$GLOBALS['sgs_test_users'][9] = $resolver;

// -- (a) wp_mail() fallback path: no Sgs_Mailer class defined yet -----------
// (must run BEFORE the class stub below — PHP classes cannot be undeclared).

ok( ! class_exists( '\SGS\Blocks\Mail\Sgs_Mailer' ), 'precondition: Sgs_Mailer is not yet defined, so the fallback path is what runs next' );

$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = 'owner@example.com';

reset_wp_mail_log();
$mailer = new Notes_Mailer();
$sent_created = $mailer->notify( 'created', make_note() );
$call_created = last_wp_mail_call();

ok( true === $sent_created, 'notify( created ) reports success via the wp_mail() fallback' );
ok( null !== $call_created && 'owner@example.com' === $call_created['to'], 'the wp_mail() fallback mails the notification-address option' );
ok( null !== $call_created && false !== strpos( $call_created['subject'], 'New note' ), 'the created-event subject names the event' );
ok( null !== $call_created && false !== strpos( $call_created['subject'], 'Homepage' ), 'the subject names the page title' );
ok( null !== $call_created && false !== strpos( $call_created['message'], 'Ada Author' ), 'the text body names who wrote the note' );

reset_wp_mail_log();
$sent_resolved = $mailer->notify( 'resolved', make_note( array( 'resolved_by' => 9, 'status' => 'resolved' ) ) );
$call_resolved = last_wp_mail_call();

ok( true === $sent_resolved, 'notify( resolved ) reports success via the wp_mail() fallback' );
ok( null !== $call_resolved && false !== strpos( $call_resolved['subject'], 'Note resolved' ), 'the resolved-event subject names the event' );
ok( null !== $call_resolved && false !== strpos( $call_resolved['message'], 'Rita Resolver' ), 'the text body names who resolved the note (not who wrote it)' );

// -- (b) empty notification-address option sends nothing --------------------

$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = '';
reset_wp_mail_log();
$sent_empty = $mailer->notify( 'created', make_note() );
ok( false === $sent_empty, 'an empty notification-address option returns false' );
ok( null === last_wp_mail_call(), 'an empty notification-address option sends nothing' );

$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = 'not-an-email';
reset_wp_mail_log();
$sent_invalid = $mailer->notify( 'created', make_note() );
ok( false === $sent_invalid, 'an invalid notification-address option returns false' );
ok( null === last_wp_mail_call(), 'an invalid notification-address option sends nothing' );

$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = 'owner@example.com';

// -- (c) note text containing <script> is escaped in the text body ----------

reset_wp_mail_log();
$mailer->notify( 'created', make_note( array( 'comment' => '<script>alert(1)</script> hello' ) ) );
$call_xss = last_wp_mail_call();
ok(
	null !== $call_xss && false === strpos( $call_xss['message'], '<script>' ) && false !== strpos( $call_xss['message'], 'alert(1)' ),
	'note text with <script> has the tag stripped/escaped in the text body, not the whole message dropped'
);

// -- (d) a notification address containing "\r\nBcc:" sends nothing --------

reset_wp_mail_log();
$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = "owner@example.com\r\nBcc: attacker@example.com";
$sent_crlf = $mailer->notify( 'created', make_note() );
ok( false === $sent_crlf, 'a CRLF-bearing notification address returns false' );
ok( null === last_wp_mail_call(), 'a CRLF-bearing notification address never reaches wp_mail()' );

$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = 'owner@example.com';

// -- (e) NEGATIVE CONTROL: the same injection checker against a naive sender -

/**
 * A deliberately naive notifier that skips the CRLF guard on the recipient
 * option — proves the injection checker can actually go red.
 */
function naive_notify_no_crlf_guard( string $raw_recipient ): bool {
	$recipient = sanitize_email( $raw_recipient );
	if ( '' === $recipient ) {
		// sanitize_email() already strips whitespace/CRLF-bearing strings in
		// this stub, so bypass it here to model a truly naive implementation
		// that passes the raw option straight to wp_mail().
		$recipient = $raw_recipient;
	}
	return wp_mail( $recipient, 'Subject', 'Body' );
}

function recipient_option_is_vulnerable_to_crlf( callable $notify_with_option ): bool {
	reset_wp_mail_log();
	$notify_with_option( "owner@example.com\r\nBcc: attacker@example.com" );
	return null !== last_wp_mail_call();
}

$real_vulnerable = recipient_option_is_vulnerable_to_crlf(
	static function ( string $raw_recipient ) use ( $mailer ): void {
		$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = $raw_recipient;
		$mailer->notify( 'created', make_note() );
	}
);
$naive_vulnerable = recipient_option_is_vulnerable_to_crlf(
	static function ( string $raw_recipient ): void {
		naive_notify_no_crlf_guard( $raw_recipient );
	}
);

$GLOBALS['sgs_test_options']['sgs_client_notes_notification_email'] = 'owner@example.com';

ok( false === $real_vulnerable, 'the real Notes_Mailer::notify() is not vulnerable to a CRLF notification address' );
ok( true === $naive_vulnerable, 'NEGATIVE CONTROL: the naive notifier IS vulnerable to a CRLF recipient (proves the checker can fail)' );

// -- (f) Sgs_Mailer path used when the class exists --------------------------
// Declared conditionally so PHP does not hoist it at compile time —
// class_exists( '\SGS\Blocks\Mail\Sgs_Mailer' ) must stay false for every
// assertion above this point, proving the wp_mail() fallback ran where it
// was meant to.

$GLOBALS['sgs_test_sgs_mailer_calls'] = array();

sgs_test_define_fake_sgs_mailer();

ok( class_exists( '\SGS\Blocks\Mail\Sgs_Mailer' ), 'precondition: the fake Sgs_Mailer class is now defined for the remaining assertions' );

reset_wp_mail_log();
$sent_via_mailer = $mailer->notify( 'created', make_note( array( 'comment' => '<script>alert(1)</script> hi' ) ) );
$mailer_call     = end( $GLOBALS['sgs_test_sgs_mailer_calls'] );

ok( true === $sent_via_mailer, 'notify() reports success via the Sgs_Mailer path' );
ok( null === last_wp_mail_call(), 'the Sgs_Mailer path never calls wp_mail() directly' );
ok( false !== $mailer_call && 'owner@example.com' === $mailer_call['to'], 'the Sgs_Mailer path is called with the notification-address option' );
ok(
	false !== $mailer_call && false === strpos( $mailer_call['html_body'], '<script>' ) && false !== strpos( $mailer_call['html_body'], 'alert(1)' ),
	'note text with <script> is escaped in the HTML body passed to Sgs_Mailer'
);
ok(
	false !== $mailer_call && false === strpos( $mailer_call['text_body'], '<script>' ) && false !== strpos( $mailer_call['text_body'], 'alert(1)' ),
	'note text with <script> is escaped in the text body passed to Sgs_Mailer'
);

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );

}
