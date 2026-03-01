<?php
/**
 * Frontend: Asset Loader
 *
 * @package SGS\ClientNotes
 *
 * @since 1.0.0
 */

namespace SGS\ClientNotes\Frontend;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Frontend Loader class.
 *
 * @since 1.0.0
 */
class Frontend_Loader {

	/**
	 * Initialise frontend hooks.
	 *
	 * @since 1.0.0
	 */
	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_action( 'wp_footer', array( __CLASS__, 'render_toolbar' ) );
	}

	/**
	 * Enqueue frontend assets.
	 *
	 * @since 1.0.0
	 */
	public static function enqueue_assets() {
		// Only load for users who can create or manage notes.
		if ( ! current_user_can( 'sgs_create_notes' ) && ! current_user_can( 'sgs_manage_notes' ) ) {
			return;
		}

		wp_enqueue_style(
			'sgs-client-notes-frontend',
			SGS_CLIENT_NOTES_URL . 'assets/css/frontend.css',
			array(),
			SGS_CLIENT_NOTES_VERSION
		);

		wp_enqueue_script(
			'sgs-client-notes-pin-renderer',
			SGS_CLIENT_NOTES_URL . 'assets/js/pin-renderer.js',
			array(),
			SGS_CLIENT_NOTES_VERSION,
			true
		);

		wp_enqueue_script(
			'sgs-client-notes-comment-panel',
			SGS_CLIENT_NOTES_URL . 'assets/js/comment-panel.js',
			array( 'sgs-client-notes-pin-renderer' ),
			SGS_CLIENT_NOTES_VERSION,
			true
		);

		if ( current_user_can( 'sgs_create_notes' ) ) {
			// Screenshot capture — loaded on demand by screenshot.js, never on page load.
			wp_register_script(
				'sgs-client-notes-screenshot',
				SGS_CLIENT_NOTES_URL . 'assets/js/screenshot.js',
				array(),
				SGS_CLIENT_NOTES_VERSION,
				true
			);

			wp_enqueue_script(
				'sgs-client-notes-annotation',
				SGS_CLIENT_NOTES_URL . 'assets/js/annotation-mode.js',
				array( 'sgs-client-notes-comment-panel', 'sgs-client-notes-screenshot' ),
				SGS_CLIENT_NOTES_VERSION,
				true
			);
		}

		wp_localize_script(
			'sgs-client-notes-pin-renderer',
			'sgsClientNotes',
			array(
				'apiUrl'        => rest_url( 'sgs-client-notes/v1' ),
				'nonce'         => wp_create_nonce( 'wp_rest' ),
				'currentUrl'    => home_url( add_query_arg( null, null ) ),
				'postId'        => get_the_ID(),
				'canCreate'     => current_user_can( 'sgs_create_notes' ),
				'canManage'     => current_user_can( 'sgs_manage_notes' ),
				'userId'        => get_current_user_id(),
				'viewportWidth' => 0,
				'vendorUrl'     => SGS_CLIENT_NOTES_URL . 'assets/vendor',
			)
		);
	}

	/**
	 * Render frontend toolbar.
	 *
	 * @since 1.0.0
	 */
	public static function render_toolbar() {
		if ( ! current_user_can( 'sgs_create_notes' ) ) {
			return;
		}

		?>
		<div id="sgs-client-notes-toolbar" class="sgs-cn-toolbar">
			<button type="button" id="sgs-cn-toggle-annotation" class="sgs-cn-toolbar-btn">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2ZM10 16C6.69 16 4 13.31 4 10C4 6.69 6.69 4 10 4C13.31 4 16 6.69 16 10C16 13.31 13.31 16 10 16ZM10.5 6H9.5V11H10.5V6ZM10.5 12H9.5V13H10.5V12Z" fill="currentColor"/>
				</svg>
				<span><?php esc_html_e( 'Leave Feedback', 'sgs-client-notes' ); ?></span>
			</button>
		</div>
		<?php
	}
}
