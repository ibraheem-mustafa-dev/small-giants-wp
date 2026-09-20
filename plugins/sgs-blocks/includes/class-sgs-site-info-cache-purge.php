<?php
/**
 * SGS Site Info Cache Purge — invalidates the LiteSpeed full-page cache when the
 * `sgs_site_info` store changes.
 *
 * The store feeds site-wide chrome (the logo, contact details, socials, the
 * copyright line), so a change to it invalidates every cached page rather than a
 * single post. Without this, an operator's edit is invisible to visitors until
 * the page cache expires on its own.
 *
 * Follows the LiteSpeed guard precedent in {@see Cart_Cache_Purge}: the purge
 * action is fired only when something is listening for it, so a site without
 * LiteSpeed is a silent no-op.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-site-info.php';

/**
 * Class Sgs_Site_Info_Cache_Purge
 */
final class Sgs_Site_Info_Cache_Purge {

	/** The LiteSpeed action that clears the whole page cache. */
	const PURGE_ACTION = 'litespeed_purge_all';

	/**
	 * Wire the option-change hooks. Called once from the plugin bootstrap.
	 *
	 * `update_option_{$option}` covers every later edit; `add_option_{$option}`
	 * covers the first write, which does not fire the update hook.
	 */
	public static function register(): void {
		\add_action( 'update_option_' . Sgs_Site_Info::OPTION_KEY, array( __CLASS__, 'purge' ), 10, 0 );
		\add_action( 'add_option_' . Sgs_Site_Info::OPTION_KEY, array( __CLASS__, 'purge' ), 10, 0 );
	}

	/**
	 * Purge the LiteSpeed full-page cache when LiteSpeed is active.
	 *
	 * @return void
	 */
	public static function purge(): void {
		if ( ! \has_action( self::PURGE_ACTION ) ) {
			return;
		}
		\do_action( self::PURGE_ACTION );
	}
}
