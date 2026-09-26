<?php
/**
 * REST API: Notes Email Notifications
 *
 * Sends the client-notes notification email (Spec 04, unified-email plan
 * Phase 5). Independent of `Rest_Notes::send_webhook()`'s optional N8N
 * automation event: this is the guaranteed notification path, the N8N
 * webhook stays as an optional extra.
 *
 * @package SGS\ClientNotes
 */

namespace SGS\ClientNotes\API;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Notes_Mailer.
 */
class Notes_Mailer {

	/**
	 * Notify the notification address about a note event.
	 *
	 * Sends nothing (and returns false) when `sgs_client_notes_notification_email`
	 * is empty or does not sanitise to a valid email address.
	 *
	 * @param string $event 'created' or 'resolved'.
	 * @param array  $note  Note row (associative array, as returned by $wpdb->get_row( ..., ARRAY_A )).
	 * @return bool True when the email was sent, false otherwise.
	 */
	public function notify( $event, $note ) {
		$raw_recipient = get_option( 'sgs_client_notes_notification_email', '' );

		if ( ! is_string( $raw_recipient ) || 1 === preg_match( '/[\r\n]/', $raw_recipient ) ) {
			return false;
		}

		$recipient = sanitize_email( $raw_recipient );
		if ( '' === $recipient || ! is_email( $recipient ) ) {
			return false;
		}

		$post       = get_post( $note['post_id'] );
		$page_title = $post ? $post->post_title : __( '(unknown page)', 'sgs-client-notes' );
		$page_url   = ! empty( $note['page_url'] ) ? $note['page_url'] : ( $post ? get_permalink( $post ) : '' );

		if ( 'resolved' === $event ) {
			$actor_id   = ! empty( $note['resolved_by'] ) ? $note['resolved_by'] : 0;
			$event_name = __( 'Note resolved', 'sgs-client-notes' );
		} else {
			$actor_id   = ! empty( $note['user_id'] ) ? $note['user_id'] : 0;
			$event_name = __( 'New note', 'sgs-client-notes' );
		}

		$actor      = $actor_id ? get_userdata( $actor_id ) : false;
		$actor_name = $actor ? $actor->display_name : __( 'Unknown', 'sgs-client-notes' );

		// Subjects are plain text: decode the entities get_bloginfo() and post titles carry (Mama&#039;s).
		$site_name = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$subject   = $this->strip_crlf( sprintf( '[%s] %s on %s', $site_name, $event_name, wp_specialchars_decode( $page_title, ENT_QUOTES ) ) );

		$admin_link = admin_url( 'admin.php?page=sgs-client-notes' );

		$text_body = $this->build_text_body( $event_name, $note['comment'], $actor_name, $page_title, $page_url, $admin_link );

		if ( class_exists( '\SGS\Blocks\Mail\Sgs_Mailer' ) ) {
			$html_body = $this->build_html_body( $event_name, $note['comment'], $actor_name, $page_title, $page_url, $admin_link );

			return \SGS\Blocks\Mail\Sgs_Mailer::send( $recipient, $subject, $event_name, $html_body, $text_body );
		}

		return (bool) wp_mail( $recipient, $subject, $text_body );
	}

	/**
	 * Email the note's author when someone else replies to their note (Spec
	 * 05 item 5, unified-email plan row 5b).
	 *
	 * Sends nothing (and returns false) when the note has no author, the
	 * author's email doesn't sanitise to a valid address, or the replier IS
	 * the note's author (no self-notification).
	 *
	 * @param array $note  Note row (associative array, as returned by $wpdb->get_row( ..., ARRAY_A )).
	 * @param array $reply Reply row (associative array, as returned by $wpdb->get_row( ..., ARRAY_A )).
	 * @return bool True when the email was sent, false otherwise.
	 */
	public function notify_reply( $note, $reply ) {
		$note_author_id = ! empty( $note['user_id'] ) ? (int) $note['user_id'] : 0;
		$replier_id     = ! empty( $reply['user_id'] ) ? (int) $reply['user_id'] : 0;

		if ( ! $note_author_id || $note_author_id === $replier_id ) {
			return false;
		}

		$note_author = get_userdata( $note_author_id );
		if ( ! $note_author ) {
			return false;
		}

		$recipient = sanitize_email( $note_author->user_email );
		if ( '' === $recipient || ! is_email( $recipient ) ) {
			return false;
		}

		$post       = get_post( $note['post_id'] );
		$page_title = $post ? $post->post_title : __( '(unknown page)', 'sgs-client-notes' );
		$page_url   = ! empty( $note['page_url'] ) ? $note['page_url'] : ( $post ? get_permalink( $post ) : '' );

		$replier      = $replier_id ? get_userdata( $replier_id ) : false;
		$replier_name = $replier ? $replier->display_name : __( 'Unknown', 'sgs-client-notes' );

		$site_name  = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$event_name = __( 'New reply on your note', 'sgs-client-notes' );
		$subject    = $this->strip_crlf( sprintf( '[%s] %s on %s', $site_name, $event_name, wp_specialchars_decode( $page_title, ENT_QUOTES ) ) );

		$note_comment = ! empty( $note['comment'] ) ? $note['comment'] : '';
		$text_body    = $this->build_reply_text_body( $reply['comment'], $replier_name, $note_comment, $page_title, $page_url );

		if ( class_exists( '\SGS\Blocks\Mail\Sgs_Mailer' ) ) {
			$html_body = $this->build_reply_html_body( $reply['comment'], $replier_name, $note_comment, $page_title, $page_url );

			return \SGS\Blocks\Mail\Sgs_Mailer::send( $recipient, $subject, $event_name, $html_body, $text_body );
		}

		return (bool) wp_mail( $recipient, $subject, $text_body );
	}

	/**
	 * Build the reply-notification HTML body (trusted by Sgs_Mailer — every value here is escaped).
	 *
	 * @param string $reply_comment Raw reply text (unescaped).
	 * @param string $replier_name  Display name of who replied.
	 * @param string $note_comment  Raw original note text (unescaped).
	 * @param string $page_title    Page title.
	 * @param string $page_url      Page URL.
	 * @return string
	 */
	private function build_reply_html_body( $reply_comment, $replier_name, $note_comment, $page_title, $page_url ) {
		$html  = '<p>' . esc_html__( 'You have a new reply on your note:', 'sgs-client-notes' ) . '</p>';
		$html .= wpautop( esc_html( (string) $reply_comment ) );
		$html .= '<p>' . esc_html__( 'By:', 'sgs-client-notes' ) . ' ' . esc_html( $replier_name ) . '</p>';
		$html .= '<p>' . esc_html__( 'Your note:', 'sgs-client-notes' ) . ' ' . esc_html( wp_strip_all_tags( (string) $note_comment ) ) . '</p>';
		$html .= '<p>' . esc_html__( 'Page:', 'sgs-client-notes' ) . ' ' . esc_html( $page_title );

		if ( ! empty( $page_url ) ) {
			$html .= ' &mdash; <a href="' . esc_url( $page_url ) . '">' . esc_html( $page_url ) . '</a>';
		}

		$html .= '</p>';

		return $html;
	}

	/**
	 * Build the reply-notification plain-text body.
	 *
	 * @param string $reply_comment Raw reply text (unescaped).
	 * @param string $replier_name  Display name of who replied.
	 * @param string $note_comment  Raw original note text (unescaped).
	 * @param string $page_title    Page title.
	 * @param string $page_url      Page URL.
	 * @return string
	 */
	private function build_reply_text_body( $reply_comment, $replier_name, $note_comment, $page_title, $page_url ) {
		$lines   = array();
		$lines[] = __( 'You have a new reply on your note:', 'sgs-client-notes' );
		$lines[] = '';
		$lines[] = wp_strip_all_tags( (string) $reply_comment );
		$lines[] = '';
		/* translators: %s: display name of who replied. */
		$lines[] = sprintf( __( 'By: %s', 'sgs-client-notes' ), $replier_name );
		/* translators: %s: the original note text. */
		$lines[] = sprintf( __( 'Your note: %s', 'sgs-client-notes' ), wp_strip_all_tags( (string) $note_comment ) );
		/* translators: %s: page title. */
		$lines[] = sprintf( __( 'Page: %s', 'sgs-client-notes' ), $page_title );

		if ( ! empty( $page_url ) ) {
			$lines[] = $page_url;
		}

		return implode( "\n", $lines );
	}

	/**
	 * Build the HTML body (trusted by Sgs_Mailer — every value here is escaped).
	 *
	 * @param string $event_name Human-readable event name.
	 * @param string $comment    Raw note text (unescaped).
	 * @param string $actor_name Display name of who wrote/resolved the note.
	 * @param string $page_title Page title.
	 * @param string $page_url   Page URL.
	 * @param string $admin_link Link to the note in wp-admin.
	 * @return string
	 */
	private function build_html_body( $event_name, $comment, $actor_name, $page_title, $page_url, $admin_link ) {
		$html  = '<p><strong>' . esc_html( $event_name ) . '</strong></p>';
		$html .= wpautop( esc_html( (string) $comment ) );
		$html .= '<p>' . esc_html__( 'By:', 'sgs-client-notes' ) . ' ' . esc_html( $actor_name ) . '</p>';
		$html .= '<p>' . esc_html__( 'Page:', 'sgs-client-notes' ) . ' ' . esc_html( $page_title );

		if ( ! empty( $page_url ) ) {
			$html .= ' &mdash; <a href="' . esc_url( $page_url ) . '">' . esc_html( $page_url ) . '</a>';
		}

		$html .= '</p>';
		$html .= '<p><a href="' . esc_url( $admin_link ) . '">' . esc_html__( 'View in wp-admin', 'sgs-client-notes' ) . '</a></p>';

		return $html;
	}

	/**
	 * Build the plain-text body.
	 *
	 * @param string $event_name Human-readable event name.
	 * @param string $comment    Raw note text (unescaped).
	 * @param string $actor_name Display name of who wrote/resolved the note.
	 * @param string $page_title Page title.
	 * @param string $page_url   Page URL.
	 * @param string $admin_link Link to the note in wp-admin.
	 * @return string
	 */
	private function build_text_body( $event_name, $comment, $actor_name, $page_title, $page_url, $admin_link ) {
		$lines   = array();
		$lines[] = $event_name;
		$lines[] = '';
		$lines[] = wp_strip_all_tags( (string) $comment );
		$lines[] = '';
		/* translators: %s: display name of who wrote or resolved the note. */
		$lines[] = sprintf( __( 'By: %s', 'sgs-client-notes' ), $actor_name );
		/* translators: %s: page title. */
		$lines[] = sprintf( __( 'Page: %s', 'sgs-client-notes' ), $page_title );

		if ( ! empty( $page_url ) ) {
			$lines[] = $page_url;
		}

		$lines[] = '';
		/* translators: %s: wp-admin URL for the notes list. */
		$lines[] = sprintf( __( 'View in wp-admin: %s', 'sgs-client-notes' ), $admin_link );

		return implode( "\n", $lines );
	}

	/**
	 * Strip carriage returns and line feeds from a string (header-injection guard).
	 *
	 * @param string $value Raw value to clean.
	 * @return string
	 */
	private function strip_crlf( $value ) {
		return (string) preg_replace( '/[\r\n]+/', '', $value );
	}
}
