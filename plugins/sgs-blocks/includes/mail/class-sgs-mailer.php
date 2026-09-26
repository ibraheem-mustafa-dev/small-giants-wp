<?php
/**
 * SGS Mailer — the one send path for every SGS email (Spec 04, unified-email plan phase 2).
 *
 * Wraps `wp_mail()` with an HTML body plus a plain-text alternative, a safely
 * built `Reply-To` header, and the shared SGS mail template. Every caller
 * (WooCommerce shop-alert emails, forms, client notes) sends through
 * {@see self::send()} rather than calling `wp_mail()` directly, so header
 * injection defences and the template live in one place.
 *
 * @package SGS\Blocks\Mail
 * @since   1.0.0
 */

namespace SGS\Blocks\Mail;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-mail-template.php';

/**
 * Class Sgs_Mailer
 *
 * Public static API for sending SGS emails.
 */
final class Sgs_Mailer {

	/**
	 * Send an HTML email with a plain-text alternative through `wp_mail()`.
	 *
	 * Refuses to send (returns false, never calls `wp_mail()`) when `$to` is
	 * empty/invalid after `sanitize_email()`, or when the raw `$to` contains a
	 * carriage return or line feed (header injection). `$subject` and
	 * `$heading` have any CR/LF stripped before use. `$args['reply_to']` is
	 * only honoured when it sanitises to a valid email AND the raw value has
	 * no CR/LF; `$args['reply_to_name']`, if given, has CR/LF and
	 * `<>",` characters stripped. `$args['attachments']` is passed through to
	 * `wp_mail()` unchanged when it is an array.
	 *
	 * @param  string $to         Recipient email address.
	 * @param  string $subject    Email subject line.
	 * @param  string $heading    Heading shown inside the email template.
	 * @param  string $html_body  Trusted HTML body (callers must escape their own values).
	 * @param  string $text_body  Plain-text alternative body.
	 * @param  array  $args       Optional. 'reply_to', 'reply_to_name', 'attachments'.
	 * @return bool   True when `wp_mail()` reports success, false otherwise.
	 */
	public static function send( string $to, string $subject, string $heading, string $html_body, string $text_body, array $args = array() ): bool {
		if ( self::has_crlf( $to ) ) {
			return false;
		}

		$clean_to = \sanitize_email( $to );
		if ( '' === $clean_to || ! \is_email( $clean_to ) ) {
			return false;
		}

		$clean_subject = self::strip_crlf( $subject );
		$clean_heading = self::strip_crlf( $heading );

		$headers   = array( 'Content-Type: text/html; charset=UTF-8' );
		$headers[] = self::build_reply_to_header( $args );
		$headers   = \array_values( \array_filter( $headers ) );

		$attachments = ( isset( $args['attachments'] ) && \is_array( $args['attachments'] ) ) ? $args['attachments'] : array();

		$body = Sgs_Mail_Template::wrap( $clean_heading, $html_body );

		// AltBody applies to this one send only: hooked immediately before
		// wp_mail() and removed immediately after, even on exception.
		$alt_body     = $text_body;
		$set_alt_body = static function ( $phpmailer ) use ( $alt_body ): void {
			$phpmailer->AltBody = $alt_body; // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- PHPMailer's real property name.
		};

		\add_action( 'phpmailer_init', $set_alt_body );
		try {
			$sent = \wp_mail( $clean_to, $clean_subject, $body, $headers, $attachments );
		} finally {
			\remove_action( 'phpmailer_init', $set_alt_body );
		}

		return (bool) $sent;
	}

	/**
	 * Resolve the default recipient for site-owner mail: a preferred address
	 * (e.g. a form's own recipient setting) if valid, else the Site Info
	 * email, else `admin_email`.
	 *
	 * @param  string $preferred Preferred recipient address, if any.
	 * @return string Sanitised email address (may be empty if nothing resolves).
	 */
	public static function owner_recipient( string $preferred = '' ): string {
		if ( ! self::has_crlf( $preferred ) ) {
			$candidate = \sanitize_email( $preferred );
			if ( '' !== $candidate ) {
				return $candidate;
			}
		}

		if ( \class_exists( '\SGS\Blocks\Sgs_Site_Info' ) ) {
			$site_info_raw   = (string) \SGS\Blocks\Sgs_Site_Info::get( 'email', '' );
			$site_info_email = self::has_crlf( $site_info_raw ) ? '' : \sanitize_email( $site_info_raw );
			if ( '' !== $site_info_email ) {
				return $site_info_email;
			}
		}

		$admin_raw = (string) \get_option( 'admin_email', '' );
		return self::has_crlf( $admin_raw ) ? '' : \sanitize_email( $admin_raw );
	}

	/**
	 * Build the `Reply-To` header from `$args`, or an empty string when there
	 * is nothing valid to add.
	 *
	 * @param  array $args Optional args passed to send(); reads 'reply_to' and 'reply_to_name'.
	 * @return string Full header line, or ''.
	 */
	private static function build_reply_to_header( array $args ): string {
		if ( empty( $args['reply_to'] ) || ! \is_string( $args['reply_to'] ) || self::has_crlf( $args['reply_to'] ) ) {
			return '';
		}

		$reply_email = \sanitize_email( $args['reply_to'] );
		if ( '' === $reply_email || ! \is_email( $reply_email ) ) {
			return '';
		}

		$reply_name = '';
		if ( ! empty( $args['reply_to_name'] ) && \is_string( $args['reply_to_name'] ) ) {
			$reply_name = self::strip_crlf( $args['reply_to_name'] );
			$reply_name = \str_replace( array( '<', '>', '"', ',' ), '', $reply_name );
			$reply_name = \trim( $reply_name );
		}

		return '' !== $reply_name
			? "Reply-To: {$reply_name} <{$reply_email}>"
			: "Reply-To: {$reply_email}";
	}

	/**
	 * Whether a raw string contains a carriage return or line feed.
	 *
	 * @param  string $value Raw value to check.
	 * @return bool
	 */
	private static function has_crlf( string $value ): bool {
		return 1 === \preg_match( '/[\r\n]/', $value );
	}

	/**
	 * Strip carriage returns and line feeds from a string.
	 *
	 * @param  string $value Raw value to clean.
	 * @return string
	 */
	private static function strip_crlf( string $value ): string {
		return (string) \preg_replace( '/[\r\n]+/', '', $value );
	}
}
