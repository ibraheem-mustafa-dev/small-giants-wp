<?php
/**
 * SGS REST nonce refresh: hands the browser a fresh `wp_rest` nonce when the one printed in a cached page has expired.
 *
 * Several front-end features print a `wp_rest` nonce into the page and send it back as `X-WP-Nonce`. A full-page cache
 * (LiteSpeed, a CDN) can serve a page older than the nonce's 12 to 24 hour life, and every such request then answers 403.
 * The shared front-end helper `src/shared/rest-nonce.js` asks this action for a new nonce once, remembers it and retries.
 *
 * This is an `admin-ajax.php` action and deliberately not a REST route: WordPress's REST API sends CORS headers that let
 * another origin read a response made with the visitor's cookies, which would hand a signed-in visitor's nonce to a
 * hostile site. `admin-ajax.php` sends no such headers, so only a same-origin page can read the reply. The reply is never
 * cached (`nocache_headers()`) and belongs to whoever the cookies say the visitor is.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Rest_Nonce_Refresh
 */
final class Rest_Nonce_Refresh {

	/**
	 * The admin-ajax action name.
	 */
	public const ACTION = 'sgs_rest_nonce';

	/**
	 * The `<meta>` name the front-end helper reads the action URL from.
	 */
	public const META_NAME = 'sgs-rest-nonce-url';

	/**
	 * Register the action for signed-in and signed-out visitors and print the URL meta tag on the front end.
	 */
	public static function register(): void {
		add_action( 'wp_ajax_' . self::ACTION, array( __CLASS__, 'handle' ) );
		add_action( 'wp_ajax_nopriv_' . self::ACTION, array( __CLASS__, 'handle' ) );
		add_action( 'wp_head', array( __CLASS__, 'print_url_meta' ), 5 );
	}

	/**
	 * The URL of the action, from `admin_url()`.
	 *
	 * @return string
	 */
	public static function url(): string {
		return add_query_arg( 'action', self::ACTION, admin_url( 'admin-ajax.php' ) );
	}

	/**
	 * Print the `<meta>` tag the helper reads. One tag per page; the URL never changes, so a cached page keeps it valid.
	 */
	public static function print_url_meta(): void {
		printf( '<meta name="%1$s" content="%2$s">' . "\n", esc_attr( self::META_NAME ), esc_url( self::url() ) );
	}

	/**
	 * Send a fresh `wp_rest` nonce for the current visitor, uncached, as `{ "nonce": "..." }`.
	 */
	public static function handle(): void {
		nocache_headers();
		wp_send_json( array( 'nonce' => wp_create_nonce( 'wp_rest' ) ) );
	}
}
