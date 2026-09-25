<?php
/**
 * Authenticated download handler for SGS form uploads.
 *
 * Every file an SGS form accepts (Form_Upload::handle()) is stored in a
 * PRIVATE, non-web-servable directory — there is no public URL to it at
 * all. This class is the only door back in: an admin-post.php action,
 * gated by the same `manage_options` capability the forms admin already
 * requires to view submissions (Form_REST_API::require_manage_options()),
 * plus a per-file nonce, that streams the file with a forced download
 * disposition. Registered from sgs-blocks.php; choice-flow uploads on an
 * order use it too (includes/flow-fields/class-flow-fields-cart.php).
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * Authenticated download handler for SGS form uploads.
 */
class Form_Download {

	/**
	 * Nonce action prefix. The full action includes the attachment ID so
	 * one submission's download link can't be replayed against another
	 * file ID by swapping the `file_id` query arg while keeping the nonce.
	 */
	const NONCE_ACTION_PREFIX = 'sgs_form_download_';

	/**
	 * Register the admin-post.php action.
	 *
	 * Deliberately only the logged-in variant (`admin_post_{action}`), not
	 * `admin_post_nopriv_{action}` — an anonymous request never reaches
	 * `handle_download()` at all; WordPress's own admin-post.php routing
	 * returns its generic "0" response for nopriv hits with no registered
	 * nopriv handler, before any of our code runs.
	 */
	public static function register(): void {
		add_action( 'admin_post_sgs_form_download', [ __CLASS__, 'handle_download' ] );
	}

	/**
	 * Build a nonced download URL for a given attachment ID.
	 *
	 * Callers must generate this URL fresh at DISPLAY time (i.e. inside
	 * the request that renders the submissions admin screen), never store
	 * it — a nonce baked into a database row would expire and permanently
	 * break that download link.
	 *
	 * @param int $file_id Attachment post ID (must carry
	 *                     Form_Upload::UPLOAD_META_KEY).
	 * @return string Nonced admin-post.php URL.
	 */
	public static function download_url( int $file_id ): string {
		$file_id = absint( $file_id );

		return wp_nonce_url(
			admin_url( 'admin-post.php?action=sgs_form_download&file_id=' . $file_id ),
			self::NONCE_ACTION_PREFIX . $file_id
		);
	}

	/**
	 * Stream a form upload to an authenticated, authorised admin.
	 *
	 * Order of checks matters: capability first (cheapest, and avoids
	 * telling an unprivileged-but-logged-in user whether their nonce
	 * would otherwise have been accepted), then nonce (CSRF protection),
	 * then the upload-provenance check (this handler must never become a
	 * generic "download any attachment by ID" oracle).
	 */
	public static function handle_download(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die(
				esc_html__( 'You do not have permission to download this file.', 'sgs-blocks' ),
				esc_html__( 'Forbidden', 'sgs-blocks' ),
				[ 'response' => 403 ]
			);
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified explicitly via check_admin_referer() below, which reads $_REQUEST['_wpnonce'] itself.
		$file_id = isset( $_GET['file_id'] ) ? absint( wp_unslash( $_GET['file_id'] ) ) : 0;

		if ( ! $file_id ) {
			wp_die(
				esc_html__( 'No file specified.', 'sgs-blocks' ),
				esc_html__( 'Bad request', 'sgs-blocks' ),
				[ 'response' => 400 ]
			);
		}

		// Dies with WordPress's standard "Are you sure you want to do
		// this?" (403) page on failure — matches core's own admin-post.php
		// download actions (e.g. Tools > Export Personal Data).
		check_admin_referer( self::NONCE_ACTION_PREFIX . $file_id );

		// Refuse anything that isn't an attachment Form_Upload itself
		// created — otherwise this handler could be pointed at any
		// attachment ID on the site (media library images, other
		// plugins' private uploads, etc.) purely because the requesting
		// user happens to have manage_options.
		$post = get_post( $file_id );

		if (
			! $post
			|| 'attachment' !== $post->post_type
			|| ! get_post_meta( $file_id, Form_Upload::UPLOAD_META_KEY, true )
		) {
			wp_die(
				esc_html__( 'File not found.', 'sgs-blocks' ),
				esc_html__( 'Not found', 'sgs-blocks' ),
				[ 'response' => 404 ]
			);
		}

		$file_path = get_attached_file( $file_id );

		if ( ! $file_path || ! file_exists( $file_path ) ) {
			wp_die(
				esc_html__( 'File not found.', 'sgs-blocks' ),
				esc_html__( 'Not found', 'sgs-blocks' ),
				[ 'response' => 404 ]
			);
		}

		$mime         = get_post_mime_type( $file_id );
		$mime         = $mime ? $mime : 'application/octet-stream';
		$display_name = get_the_title( $file_id );
		$display_name = $display_name ? $display_name : basename( $file_path );
		$display_name = sanitize_file_name( $display_name );

		// Discard any buffered output so nothing corrupts the binary body.
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		nocache_headers();
		header( 'Content-Type: ' . $mime );
		header( 'Content-Disposition: attachment; filename="' . $display_name . '"' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Content-Length: ' . (string) filesize( $file_path ) );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_readfile -- streaming a large binary file; reading it into memory first would defeat the purpose.
		readfile( $file_path );
		exit;
	}
}
