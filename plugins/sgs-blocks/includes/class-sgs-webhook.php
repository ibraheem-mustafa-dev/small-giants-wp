<?php
/**
 * SGS Webhook — single N8N dispatch point (Spec 30 P5, FR-30-14/15 contract).
 *
 * Every SGS notification (forms, back-in-stock, wishlist alerts) that needs
 * to leave the site goes through here (or through `Form_Processor`'s own
 * copy of the same recipe) — never `wp_mail()`. Reads the shared
 * `sgs_n8n_webhook_url` option, HTTPS only, non-blocking by default.
 *
 * @package SGS\Blocks
 * @since   1.19.0 (FR-30-14/15 Spec 30 P5)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Posts a `{event, site_url, sent_at, data}` envelope to the N8N webhook URL. */
final class Sgs_Webhook {

	/**
	 * Send one event to the configured N8N webhook.
	 *
	 * Reads `sgs_n8n_webhook_url`, applies the `sgs_webhook_url` filter
	 * (keyed by `$event`), and refuses anything that isn't a non-empty
	 * `https://` URL. Non-blocking with a 10ms timeout by default; the
	 * `sgs_webhook_blocking` filter can switch to a blocking 5s request
	 * (tests, live proofs that need the real response).
	 *
	 * @param string $event   Event name, e.g. 'sgs_back_in_stock'.
	 * @param array  $payload Event-specific data, nested under `data`.
	 * @return bool True once a POST was attempted, false if the URL is
	 *              missing, empty or not HTTPS.
	 */
	public static function send( string $event, array $payload ): bool {
		$url = (string) \get_option( 'sgs_n8n_webhook_url', '' );

		/**
		 * Filter the N8N webhook URL for a specific event.
		 *
		 * @param string $url   Webhook URL from options.
		 * @param string $event Event name being dispatched.
		 */
		$url = (string) \apply_filters( 'sgs_webhook_url', $url, $event );

		if ( '' === $url ) {
			return false;
		}

		if ( 'https' !== \wp_parse_url( $url, PHP_URL_SCHEME ) ) {
			return false;
		}

		$body = array(
			'event'    => $event,
			'site_url' => \get_site_url(),
			'sent_at'  => \gmdate( 'c' ),
			'data'     => $payload,
		);

		/**
		 * Filter whether the webhook POST blocks for a response.
		 *
		 * Defaults to false (fire-and-forget) so a slow or unreachable N8N
		 * instance never delays the request that triggered the event.
		 * Tests and live proofs that need to confirm delivery set this true.
		 *
		 * @param bool $blocking Whether to block for a response.
		 */
		$blocking = (bool) \apply_filters( 'sgs_webhook_blocking', false );

		// wp_safe_remote_post blocks requests to internal/private IP ranges.
		\wp_safe_remote_post(
			$url,
			array(
				'body'     => \wp_json_encode( $body ),
				'headers'  => array( 'Content-Type' => 'application/json' ),
				'blocking' => $blocking,
				'timeout'  => $blocking ? 5 : 0.01,
			)
		);

		return true;
	}
}
