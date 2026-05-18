<?php
/**
 * SGS top-level admin menu (FR-S5-1, Spec 17 Wave 2).
 *
 * Registers a single "SGS" top-level menu in wp-admin that owns every
 * framework-level admin surface. The top-level entry has no page render of its
 * own — WordPress auto-creates a first submenu pointing at the same slug, which
 * we suppress because the real first submenu (Site Info, FR-S4-3) is added by
 * {@see Sgs_Site_Info_Admin::add_menu()}.
 *
 * Position 58 places the menu between Appearance (60) and Plugins (65), which
 * is the natural slot for a "site personalisation" surface. Icon
 * `dashicons-art` matches that semantic. Capability `edit_theme_options` mirrors
 * every existing SGS admin entry point, so subscribers and editors see nothing.
 *
 * Future FRs add submenus by calling `add_submenu_page( 'sgs', ... )` directly —
 * this class only owns the top-level menu registration.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Admin_Menu
 *
 * Registers the top-level SGS menu. Idempotent — register() can be called
 * multiple times safely (add_action de-duplicates per callback).
 */
final class Sgs_Admin_Menu {

	/** Top-level menu slug — referenced by every SGS submenu's parent. */
	const MENU_SLUG = 'sgs';

	/** Capability gate — matches every other SGS admin surface. */
	const CAP = 'edit_theme_options';

	/**
	 * Menu position. 58 places the entry between Appearance (60) and Plugins
	 * (65), the natural slot for a site-personalisation surface.
	 */
	const POSITION = 58;

	/** Dashicon class. `art` semantically matches design / personalisation. */
	const ICON = 'dashicons-art';

	/**
	 * Wire WP hooks. Safe to call from sgs-blocks.php bootstrap. MUST be
	 * called BEFORE any submenu-registering class (e.g. Sgs_Site_Info_Admin)
	 * so the top-level menu exists by the time submenus are added.
	 */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu' ), 5 );
	}

	/**
	 * Register the top-level SGS menu. Priority 5 (set in register()) fires
	 * before the default priority 10, guaranteeing the parent menu exists
	 * before any submenu_page call references it as `parent_slug = 'sgs'`.
	 *
	 * The top-level menu's own callback is intentionally a no-op shim that
	 * delegates to the first submenu — WP fires this for users who land on
	 * admin.php?page=sgs directly. The Site Info submenu (FR-S4-3) overrides
	 * the auto-created first submenu via its own add_submenu_page call.
	 */
	public static function add_menu(): void {
		\add_menu_page(
			\__( 'SGS', 'sgs-blocks' ),
			\__( 'SGS', 'sgs-blocks' ),
			self::CAP,
			self::MENU_SLUG,
			array( __CLASS__, 'render_landing' ),
			self::ICON,
			self::POSITION
		);
	}

	/**
	 * Fallback landing renderer. WP fires this when an operator lands on
	 * admin.php?page=sgs with no submenu override. Currently redirects to the
	 * first concrete submenu (Site Info, FR-S4-3). When future submenus ship
	 * with their own landing dashboard, this can be replaced.
	 */
	public static function render_landing(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		echo '<div class="wrap">';
		echo '<h1>' . \esc_html__( 'SGS Framework', 'sgs-blocks' ) . '</h1>';
		echo '<p>' . \esc_html__( 'Choose a section from the SGS submenu on the left.', 'sgs-blocks' ) . '</p>';
		echo '</div>';
	}
}
