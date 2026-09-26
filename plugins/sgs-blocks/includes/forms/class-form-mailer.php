<?php
/**
 * Form_Mailer — sends the owner notification and optional submitter
 * confirmation for a stored form submission (Spec 04, unified-email plan
 * phase 4; Spec 43 FR-43-4 for the choice-flow email-capture terminal).
 *
 * The one place `Form_Processor::process()` and `Choice_Flow_Submit::handle()`
 * reach for email — both already store the submission and (optionally) fire
 * the N8N automation webhook; this class is the `wp_mail()` notification path
 * itself, routed entirely through `SGS\Blocks\Mail\Sgs_Mailer::send()` so
 * header-injection defences and the shared template live in one place.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

use SGS\Blocks\Mail\Sgs_Mailer;

/**
 * Class Form_Mailer
 */
final class Form_Mailer {

	/**
	 * Field keys never shown in the owner notification table, and never
	 * considered when looking for the submitter's own email address.
	 */
	private const INTERNAL_KEYS = array( 'sgs_hp', 'honeypot', 'nonce', 'flowref', 'tags' );

	/**
	 * Send the owner notification and, when enabled, the submitter's
	 * confirmation email, for one stored submission.
	 *
	 * @param string $form_id        Form identifier (used in the owner subject
	 *                               when $form_name is blank).
	 * @param string $form_name      Human-readable form name, or ''.
	 * @param array  $fields         Already-sanitised submitted field data
	 *                               (the same array Form_Processor stores).
	 * @param array  $email_settings 'notifyEmail', 'confirmationEmail',
	 *                               'confirmationSubject', 'confirmationMessage'.
	 */
	public static function send_notifications( string $form_id, string $form_name, array $fields, array $email_settings ): void {
		$submitter_email = self::extract_submitter_email( $fields );

		self::send_owner_notification( $form_id, $form_name, $fields, $email_settings, $submitter_email );

		if ( ! empty( $email_settings['confirmationEmail'] ) && '' !== $submitter_email ) {
			self::send_confirmation( $submitter_email, $email_settings );
		}
	}

	/**
	 * Email the site owner every submitted field.
	 *
	 * @param string $form_id         Form identifier.
	 * @param string $form_name       Human-readable form name, or ''.
	 * @param array  $fields          Sanitised submitted field data.
	 * @param array  $email_settings  Reads 'notifyEmail'.
	 * @param string $submitter_email A valid submitter email, or '' — used as Reply-To.
	 */
	private static function send_owner_notification( string $form_id, string $form_name, array $fields, array $email_settings, string $submitter_email ): void {
		$to = Sgs_Mailer::owner_recipient( (string) ( $email_settings['notifyEmail'] ?? '' ) );

		if ( '' === $to ) {
			return;
		}

		$label = '' !== trim( $form_name ) ? $form_name : $form_id;
		/* translators: %s: form name or identifier. */
		$subject = sprintf( __( 'New form submission: %s', 'sgs-blocks' ), $label );

		list( $html_rows, $text_lines ) = self::render_fields( $fields );

		$html_body = '<table role="presentation" style="width:100%;border-collapse:collapse;">' . $html_rows . '</table>';
		$text_body = implode( "\n", $text_lines );

		$args = array();
		if ( '' !== $submitter_email ) {
			$args['reply_to'] = $submitter_email;
		}

		Sgs_Mailer::send( $to, $subject, $subject, $html_body, $text_body, $args );
	}

	/**
	 * Email the submitter a confirmation of their submission.
	 *
	 * @param string $to             The submitter's own (already-validated) email.
	 * @param array  $email_settings Reads 'confirmationSubject', 'confirmationMessage'.
	 */
	private static function send_confirmation( string $to, array $email_settings ): void {
		$subject = trim( (string) ( $email_settings['confirmationSubject'] ?? '' ) );
		if ( '' === $subject ) {
			$subject = __( 'Thanks for your submission', 'sgs-blocks' );
		}

		$message = trim( (string) ( $email_settings['confirmationMessage'] ?? '' ) );
		if ( '' === $message ) {
			$message = __( "Thank you — we've received your submission and will be in touch shortly.", 'sgs-blocks' );
		}

		$html_body = wpautop( esc_html( $message ) );
		$text_body = $message;

		Sgs_Mailer::send( $to, $subject, $subject, $html_body, $text_body, array() );
	}

	/**
	 * The first field whose key contains 'email' and whose value survives
	 * `is_email()` — never the raw value. `$fields` has already been through
	 * `Form_Processor::sanitise_fields()`, which blanks any email-named value
	 * holding a line break (sanitize_email() alone would rebuild
	 * "a@b.com\nBcc: x@y.com" as the valid-looking "a@b.comBccxy.com"); this
	 * method re-validates instead of trusting that upstream pass.
	 *
	 * @param array $fields Sanitised submitted field data.
	 * @return string A validated email address, or ''.
	 */
	private static function extract_submitter_email( array $fields ): string {
		foreach ( $fields as $key => $value ) {
			if ( ! is_string( $key ) || false === strpos( $key, 'email' ) || ! is_scalar( $value ) ) {
				continue;
			}

			$candidate = (string) $value;
			if ( 1 === preg_match( '/[\r\n]/', $candidate ) ) {
				continue;
			}

			$candidate = sanitize_email( $candidate );
			if ( '' !== $candidate && is_email( $candidate ) ) {
				return $candidate;
			}
		}

		return '';
	}

	/**
	 * Build the owner notification's HTML table rows and plain-text lines —
	 * every submitted field except `INTERNAL_KEYS`, each value escaped.
	 *
	 * @param array $fields Sanitised submitted field data.
	 * @return array{0:string,1:string[]} [html_rows, text_lines].
	 */
	private static function render_fields( array $fields ): array {
		$html_rows  = '';
		$text_lines = array();

		foreach ( $fields as $key => $value ) {
			if ( ! is_string( $key ) || in_array( $key, self::INTERNAL_KEYS, true ) ) {
				continue;
			}

			$label      = self::humanise_key( $key );
			$value_text = self::stringify_value( $value );

			if ( '' === $value_text ) {
				continue;
			}

			$html_rows .= '<tr>'
				. '<td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;font-weight:bold;vertical-align:top;">' . esc_html( $label ) . '</td>'
				. '<td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;white-space:pre-wrap;">' . esc_html( $value_text ) . '</td>'
				. '</tr>';

			$text_lines[] = $label . ': ' . $value_text;
		}

		return array( $html_rows, $text_lines );
	}

	/**
	 * Turn a machine field key ("business_name") into a human label
	 * ("Business Name").
	 *
	 * @param string $key Field key.
	 * @return string Human-readable label.
	 */
	private static function humanise_key( string $key ): string {
		return ucwords( str_replace( array( '_', '-' ), ' ', $key ) );
	}

	/**
	 * Flatten a field value (scalar or array of scalars) to display text.
	 *
	 * @param mixed $value Field value.
	 * @return string
	 */
	private static function stringify_value( $value ): string {
		if ( is_array( $value ) ) {
			$parts = array();
			foreach ( $value as $item ) {
				if ( is_scalar( $item ) ) {
					$parts[] = (string) $item;
				}
			}
			return implode( "\n", array_filter( $parts, static fn( $part ) => '' !== $part ) );
		}

		return is_scalar( $value ) ? (string) $value : '';
	}
}
