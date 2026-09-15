<?php
/**
 * SGS top-level admin menu (FR-S5-1, Spec 17 Wave 2).
 *
 * Registers a single "SGS" top-level menu in wp-admin that owns every
 * framework-level admin surface. The top-level entry has no page render of its
 * own — {@see Sgs_Site_Info_Admin::add_menu()} registers Site Info's submenu
 * using THIS menu's own slug (`self::MENU_SLUG`) as its submenu slug, which is
 * the WordPress convention for making a submenu page render directly when the
 * parent item is clicked, instead of WordPress's own auto-generated duplicate
 * first item. Because that submenu slug matches the parent slug, WordPress
 * does not add a second row to the sidebar for it — Site Info's page simply
 * becomes what the top-level "SGS" link opens.
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
	 * No callback is passed (deliberately empty) — `add_menu_page()` only
	 * wires an `admin_action_hook` when given a non-empty callback, so
	 * omitting it means nothing renders for this registration call alone.
	 * {@see Sgs_Site_Info_Admin::add_menu()} registers a submenu whose OWN
	 * slug also equals `self::MENU_SLUG`; WordPress resolves that as the
	 * page to render when an operator clicks "SGS" directly. Passing a
	 * callback here as well would double-render (both callbacks would fire
	 * on the same resolved hook).
	 */
	public static function add_menu(): void {
		\add_menu_page(
			\__( 'SGS', 'sgs-blocks' ),
			\__( 'SGS', 'sgs-blocks' ),
			self::CAP,
			self::MENU_SLUG,
			'',
			self::ICON,
			self::POSITION
		);
	}
}
