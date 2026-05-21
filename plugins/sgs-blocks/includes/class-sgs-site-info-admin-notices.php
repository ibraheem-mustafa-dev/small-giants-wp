<?php
/**
 * SGS Site Info — deprecated-blocks operator notices (Spec 17 Wave 2.5).
 *
 * Handles the one-shot dismissible admin notice that flags the retired
 * sgs/back-to-top and sgs/reading-progress blocks, and the admin-post handler
 * that persists the per-user dismissal. Extracted from
 * {@see Sgs_Site_Info_Admin} to keep that class under the 300-line budget.
 *
 * Capability: {@see Sgs_Site_Info_Admin::CAP} — both the notice gate and the
 * dismiss handler reference the main class's constant directly so the value
 * stays in one place.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Site_Info_Admin_Notices
 *
 * Wires the admin_notices + admin_post hooks that surface the floating-UI
 * migration path to operators after the back-to-top / reading-progress blocks
 * were retired in Wave 2 Polish 1b.
 */
final class Sgs_Site_Info_Admin_Notices {

	/** Action name for the Dismiss Floating UI Notice admin-post handler. */
	const DISMISS_FLOATING_UI_ACTION = 'sgs_site_info_dismiss_floating_ui';

	/** User-meta key for the floating-UI notice dismissal. */
	const DISMISS_FLOATING_UI_META = 'sgs_dismissed_floating_ui_notice';

	/** WP_options flag — Phase 5a (2026-05-22) variation-system migration notice. */
	const PHASE5A_NOTICE_OPTION = 'sgs_phase5a_migration_noticed';

	/**
	 * Wire WP hooks. Called from {@see Sgs_Site_Info_Admin::register()} so all
	 * hook wiring flows through a single entry point in the bootstrap.
	 */
	public static function register(): void {
		\add_action( 'admin_notices', array( __CLASS__, 'maybe_show_deprecated_blocks_notice' ) );
		\add_action( 'admin_notices', array( __CLASS__, 'maybe_show_phase5a_migration_notice' ) );
		\add_action( 'admin_post_' . self::DISMISS_FLOATING_UI_ACTION, array( __CLASS__, 'handle_dismiss_floating_ui_notice' ) );
	}

	// -------------------------------------------------------------------------
	// U3 — Deprecated-blocks operator notice (Back to Top / Reading Progress)
	// -------------------------------------------------------------------------

	/**
	 * Show a one-shot dismissible admin notice flagging the retired
	 * sgs/back-to-top and sgs/reading-progress blocks. Once dismissed for a
	 * given user, never shown again to that user.
	 */
	public static function maybe_show_deprecated_blocks_notice(): void {
		if ( ! \current_user_can( Sgs_Site_Info_Admin::CAP ) ) {
			return;
		}
		$user_id = \get_current_user_id();
		if ( ! $user_id ) {
			return;
		}
		if ( \get_user_meta( $user_id, self::DISMISS_FLOATING_UI_META, true ) ) {
			return;
		}

		$dismiss_url = \wp_nonce_url(
			\add_query_arg(
				array( 'action' => self::DISMISS_FLOATING_UI_ACTION ),
				\admin_url( 'admin-post.php' )
			),
			self::DISMISS_FLOATING_UI_ACTION
		);

		echo '<div class="notice notice-info"><p>';
		echo \esc_html__( 'SGS Floating UI update: the Back to Top and Reading Progress blocks have been retired in favour of a unified Customiser → SGS Floating UI panel (coming in the next release). Existing instances will appear as "block deleted" placeholders — replace them with the Customiser controls once they ship.', 'sgs-blocks' );
		echo ' <a href="' . \esc_url( $dismiss_url ) . '">' . \esc_html__( 'Dismiss', 'sgs-blocks' ) . '</a>';
		echo '</p></div>';
	}

	// -------------------------------------------------------------------------
	// Phase 5a — Variation-system migration notice (2026-05-22 Decision 18)
	// -------------------------------------------------------------------------

	/**
	 * Show a one-shot site-wide migration notice the first time any
	 * edit_theme_options user loads a WP Admin page after Phase 5a deploys.
	 * Once shown, the wp_options flag is set and the notice never fires again.
	 *
	 * Phase 5a retired the WP style-variation overlay system. Per-client
	 * snapshots now live at sites/<client>/theme-snapshot.json and are pushed
	 * via push-theme-snapshot.py. This notice surfaces the architectural
	 * change to the operator on first sight; no operator action is required
	 * because branding has been preserved.
	 */
	public static function maybe_show_phase5a_migration_notice(): void {
		if ( ! \current_user_can( Sgs_Site_Info_Admin::CAP ) ) {
			return;
		}
		if ( \get_option( self::PHASE5A_NOTICE_OPTION ) ) {
			return;
		}

		echo '<div class="notice notice-info is-dismissible"><p><strong>';
		echo \esc_html__( 'SGS framework update:', 'sgs-blocks' );
		echo '</strong> ';
		echo \esc_html__( 'Style variations have been migrated to per-site theme.json files. Your client\'s branding snapshot now lives at sites/<client>/theme-snapshot.json. No action required — branding is unchanged.', 'sgs-blocks' );
		echo '</p></div>';

		\update_option( self::PHASE5A_NOTICE_OPTION, \time(), false );
	}

	/**
	 * Persist the per-user dismissal of the floating-UI notice and redirect
	 * back to the referring page. Capability + nonce gated.
	 */
	public static function handle_dismiss_floating_ui_notice(): void {
		if ( ! \current_user_can( Sgs_Site_Info_Admin::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to dismiss this notice.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::DISMISS_FLOATING_UI_ACTION );
		$user_id = \get_current_user_id();
		if ( $user_id ) {
			\update_user_meta( $user_id, self::DISMISS_FLOATING_UI_META, 1 );
		}
		$redirect = \wp_get_referer();
		if ( ! $redirect ) {
			$redirect = \admin_url( 'index.php' );
		}
		\wp_safe_redirect( $redirect );
		exit;
	}
}
