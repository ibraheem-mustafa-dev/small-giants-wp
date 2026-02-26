<?php
/**
 * Main Plugin Class
 *
 * @package SGS\ClientNotes
 */

namespace SGS\ClientNotes;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main SGS Client Notes class.
 */
class SGS_Client_Notes {

	/**
	 * Single instance of the class.
	 *
	 * @var SGS_Client_Notes
	 */
	protected static $instance = null;

	/**
	 * Get the single instance.
	 *
	 * @return SGS_Client_Notes
	 */
	public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->init_hooks();
	}

	/**
	 * Initialise WordPress hooks.
	 */
	private function init_hooks() {
		// Activation and deactivation hooks.
		register_activation_hook( SGS_CLIENT_NOTES_FILE, array( $this, 'activate' ) );
		register_deactivation_hook( SGS_CLIENT_NOTES_FILE, array( $this, 'deactivate' ) );

		// Load plugin text domain.
		add_action( 'plugins_loaded', array( $this, 'load_textdomain' ) );

		// Initialise components.
		add_action( 'plugins_loaded', array( $this, 'init_components' ) );

		// Register REST API endpoints.
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );

		// Admin hooks.
		if ( is_admin() ) {
			add_action( 'admin_menu', array( $this, 'register_admin_menu' ) );
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
			add_action( 'wp_dashboard_setup', array( $this, 'register_dashboard_widget' ) );
		}

		// Frontend hooks.
		if ( ! is_admin() ) {
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_assets' ) );
			add_action( 'wp_footer', array( $this, 'render_frontend_toolbar' ) );
		}
	}

	/**
	 * Plugin activation.
	 */
	public function activate() {
		require_once SGS_CLIENT_NOTES_PATH . 'includes/class-installer.php';
		Installer::activate();
	}

	/**
	 * Plugin deactivation.
	 */
	public function deactivate() {
		// Clean up scheduled events if any.
		wp_clear_scheduled_hook( 'sgs_client_notes_cleanup' );
	}

	/**
	 * Load plugin text domain for translations.
	 */
	public function load_textdomain() {
		load_plugin_textdomain(
			'sgs-client-notes',
			false,
			dirname( SGS_CLIENT_NOTES_BASENAME ) . '/languages'
		);
	}

	/**
	 * Initialise plugin components.
	 */
	public function init_components() {
		// Initialise roles.
		require_once SGS_CLIENT_NOTES_PATH . 'includes/class-roles.php';
		Roles::init();

		// Initialise screenshot handler.
		require_once SGS_CLIENT_NOTES_PATH . 'includes/frontend/class-screenshot.php';
		Frontend\Screenshot::init();
	}

	/**
	 * Register REST API routes.
	 */
	public function register_rest_routes() {
		require_once SGS_CLIENT_NOTES_PATH . 'includes/api/class-rest-notes.php';
		require_once SGS_CLIENT_NOTES_PATH . 'includes/api/class-rest-replies.php';

		$notes_controller   = new API\Rest_Notes();
		$replies_controller = new API\Rest_Replies();

		$notes_controller->register_routes();
		$replies_controller->register_routes();
	}

	/**
	 * Register admin menu.
	 */
	public function register_admin_menu() {
		if ( ! current_user_can( 'sgs_manage_notes' ) ) {
			return;
		}

		require_once SGS_CLIENT_NOTES_PATH . 'includes/admin/class-admin-notes.php';

		$admin_notes = new Admin\Admin_Notes();
		$admin_notes->register_menu();
	}

	/**
	 * Register dashboard widget.
	 */
	public function register_dashboard_widget() {
		if ( ! current_user_can( 'sgs_manage_notes' ) ) {
			return;
		}

		require_once SGS_CLIENT_NOTES_PATH . 'includes/admin/class-admin-dashboard.php';

		$dashboard = new Admin\Admin_Dashboard();
		$dashboard->register_widget();
	}

	/**
	 * Enqueue admin assets.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_admin_assets( $hook ) {
		// Only load on our admin pages.
		if ( 'toplevel_page_sgs-client-notes' !== $hook && 'index.php' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'sgs-client-notes-admin',
			SGS_CLIENT_NOTES_URL . 'assets/css/admin.css',
			array(),
			SGS_CLIENT_NOTES_VERSION
		);
	}

	/**
	 * Enqueue frontend assets.
	 */
	public function enqueue_frontend_assets() {
		// Only load for users who can create or manage notes.
		if ( ! current_user_can( 'sgs_create_notes' ) && ! current_user_can( 'sgs_manage_notes' ) ) {
			return;
		}

		// Frontend CSS.
		wp_enqueue_style(
			'sgs-client-notes-frontend',
			SGS_CLIENT_NOTES_URL . 'assets/css/frontend.css',
			array(),
			SGS_CLIENT_NOTES_VERSION
		);

		// Pin renderer (always loaded to show existing pins).
		wp_enqueue_script(
			'sgs-client-notes-pin-renderer',
			SGS_CLIENT_NOTES_URL . 'assets/js/pin-renderer.js',
			array(),
			SGS_CLIENT_NOTES_VERSION,
			true
		);

		// Comment panel.
		wp_enqueue_script(
			'sgs-client-notes-comment-panel',
			SGS_CLIENT_NOTES_URL . 'assets/js/comment-panel.js',
			array( 'sgs-client-notes-pin-renderer' ),
			SGS_CLIENT_NOTES_VERSION,
			true
		);

		// Annotation mode (only for users who can create notes).
		if ( current_user_can( 'sgs_create_notes' ) ) {
			wp_enqueue_script(
				'sgs-client-notes-annotation',
				SGS_CLIENT_NOTES_URL . 'assets/js/annotation-mode.js',
				array( 'sgs-client-notes-comment-panel' ),
				SGS_CLIENT_NOTES_VERSION,
				true
			);
		}

		// Localise script with data.
		wp_localize_script(
			'sgs-client-notes-pin-renderer',
			'sgsClientNotes',
			array(
				'apiUrl'       => rest_url( 'sgs-client-notes/v1' ),
				'nonce'        => wp_create_nonce( 'wp_rest' ),
				'currentUrl'   => home_url( add_query_arg( null, null ) ),
				'postId'       => get_the_ID(),
				'canCreate'    => current_user_can( 'sgs_create_notes' ),
				'canManage'    => current_user_can( 'sgs_manage_notes' ),
				'userId'       => get_current_user_id(),
				'viewportWidth' => 0, // Set by JS.
			)
		);
	}

	/**
	 * Render frontend toolbar.
	 */
	public function render_frontend_toolbar() {
		// Only show for users who can create notes.
		if ( ! current_user_can( 'sgs_create_notes' ) ) {
			return;
		}

		?>
		<div id="sgs-client-notes-toolbar" class="sgs-cn-toolbar">
			<button type="button" id="sgs-cn-toggle-annotation" class="sgs-cn-toolbar-btn">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2ZM10 16C6.69 16 4 13.31 4 10C4 6.69 6.69 4 10 4C13.31 4 16 6.69 16 10C16 13.31 13.31 16 10 16ZM10.5 6H9.5V11H10.5V6ZM10.5 12H9.5V13H10.5V12Z" fill="currentColor"/>
				</svg>
				<span>Leave Feedback</span>
			</button>
		</div>
		<?php
	}
}
