<?php
/**
 * SGS Configurator compatibility + graceful degradation (Spec 27 FR-27-A5).
 *
 * The variable-product configurator needs WooCommerce >= 9.8 (Store API +
 * variation surface). Below that — or when WC is upgraded onto a site that was
 * using the no-shop CPT — the framework must degrade visibly, never silently:
 *
 *  - WC active but < 9.8: the Bound variable card renders READ-ONLY (static
 *    default price, a "View product" link, no configurator JS) and a dismissible
 *    admin notice names the required version. (The read-only render branch lives
 *    in product-card/render.php and calls is_supported() below.)
 *  - WC active on a site that still has `sgs_product` CPT cards: a dismissible
 *    admin prompt offers to link them to WooCommerce products.
 *
 * The version gate is filterable (`sgs_configurator_supported`) so it is
 * testable without downgrading WooCommerce, and so a site can override the floor.
 *
 * @package SGS\Blocks
 * @since   1.6.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Configurator_Compat
 */
final class Sgs_Configurator_Compat {

	/** Minimum WooCommerce version the configurator supports. */
	const MIN_WC = '9.8';

	/** Action name for the admin-post.php notice-dismiss handler. */
	const DISMISS_ACTION = 'sgs_dismiss_compat_notice';

	/** User-meta key prefix for persisted notice dismissals. */
	const DISMISS_META_PREFIX = 'sgs_compat_dismissed_';

	/** Wire WP hooks. Called once from the plugin bootstrap. */
	public static function register(): void {
		\add_action( 'admin_notices', array( __CLASS__, 'maybe_show_min_version_notice' ) );
		\add_action( 'admin_notices', array( __CLASS__, 'maybe_show_link_prompt' ) );
		\add_action( 'admin_post_' . self::DISMISS_ACTION, array( __CLASS__, 'handle_dismiss' ) );
	}

	// ── Capability gate ───────────────────────────────────────────────────────────

	/**
	 * Whether the live WooCommerce supports the configurator (>= MIN_WC).
	 *
	 * Filterable via `sgs_configurator_supported` — lets a site override the floor
	 * and lets tests simulate an old WooCommerce without changing the WC_VERSION
	 * constant. WC absent entirely also resolves false (the CPT fallback path,
	 * FR-27-A3, handles no-WC sites separately).
	 *
	 * @return bool
	 */
	public static function is_supported(): bool {
		$native = \defined( 'WC_VERSION' ) && \version_compare( (string) \WC_VERSION, self::MIN_WC, '>=' );
		return (bool) \apply_filters( 'sgs_configurator_supported', $native );
	}

	/** Whether WooCommerce is active at all. */
	public static function wc_active(): bool {
		return \function_exists( 'wc_get_product' );
	}

	// ── Notice 1: WC present but below the version floor ───────────────────────────

	/**
	 * Show a dismissible admin notice when WooCommerce is active but older than
	 * MIN_WC, so the operator knows the configurator is rendering read-only.
	 */
	public static function maybe_show_min_version_notice(): void {
		if ( ! \current_user_can( 'manage_woocommerce' ) && ! \current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! self::wc_active() || self::is_supported() ) {
			return; // No WC, or WC is new enough — nothing to warn about.
		}
		if ( self::is_dismissed( 'min_version' ) ) {
			return;
		}

		$current = \defined( 'WC_VERSION' ) ? (string) \WC_VERSION : \__( 'an older version', 'sgs-blocks' );

		echo '<div class="notice notice-warning">';
		echo '<p><strong>' . \esc_html__( 'SGS product configurator: read-only', 'sgs-blocks' ) . '</strong></p>';
		echo '<p>' . \esc_html(
			\sprintf(
				/* translators: 1: required WooCommerce version, 2: the active WooCommerce version. */
				\__( 'The interactive product configurator needs WooCommerce %1$s or newer. You are running %2$s, so product cards show a static price and a link to the product page until you update WooCommerce. Nothing is broken — shoppers can still buy on the product page.', 'sgs-blocks' ),
				self::MIN_WC,
				$current
			)
		) . '</p>';
		echo self::dismiss_link( 'min_version' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_url/esc_html below.
		echo '</div>';
	}

	// ── Notice 2: WC active + CPT product cards still present ──────────────────────

	/**
	 * Show a dismissible prompt when WooCommerce is active AND `sgs_product` CPT
	 * entries still exist — offering to link them to WooCommerce products rather
	 * than silently leaving them on the no-shop format (FR-27-A5).
	 */
	public static function maybe_show_link_prompt(): void {
		if ( ! \current_user_can( 'manage_woocommerce' ) && ! \current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! self::wc_active() ) {
			return; // No WC → the CPT IS the intended store; nothing to link to.
		}
		if ( self::is_dismissed( 'link_prompt' ) ) {
			return;
		}

		$count = self::cpt_product_count();
		if ( $count < 1 ) {
			return;
		}

		echo '<div class="notice notice-info">';
		echo '<p><strong>' . \esc_html__( 'SGS products + WooCommerce', 'sgs-blocks' ) . '</strong></p>';
		echo '<p>' . \esc_html(
			\sprintf(
				/* translators: %d: number of sgs_product CPT entries. */
				\_n(
					'You have %d product saved in the no-shop format and WooCommerce is now active. You can keep it as-is, or recreate it as a WooCommerce product to use live pricing, stock and the interactive configurator.',
					'You have %d products saved in the no-shop format and WooCommerce is now active. You can keep them as-is, or recreate them as WooCommerce products to use live pricing, stock and the interactive configurator.',
					$count,
					'sgs-blocks'
				),
				$count
			)
		) . '</p>';
		echo self::dismiss_link( 'link_prompt' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_url/esc_html below.
		echo '</div>';
	}

	// ── Dismissal ───────────────────────────────────────────────────────────────

	/**
	 * Build a persisted-dismiss link for a notice key (admin-post + nonce).
	 *
	 * @param string $key Notice key.
	 * @return string Escaped <p><a> markup.
	 */
	private static function dismiss_link( string $key ): string {
		$url = \wp_nonce_url(
			\add_query_arg(
				array(
					'action' => self::DISMISS_ACTION,
					'notice' => $key,
				),
				\admin_url( 'admin-post.php' )
			),
			self::DISMISS_ACTION . '_' . $key
		);
		return '<p><a href="' . \esc_url( $url ) . '">' . \esc_html__( 'Dismiss this notice', 'sgs-blocks' ) . '</a></p>';
	}

	/**
	 * Whether the current user has dismissed a notice key.
	 *
	 * @param string $key Notice key.
	 * @return bool
	 */
	private static function is_dismissed( string $key ): bool {
		return (bool) \get_user_meta( \get_current_user_id(), self::DISMISS_META_PREFIX . $key, true );
	}

	/** Persist a notice dismissal for the current user (admin-post handler). */
	public static function handle_dismiss(): void {
		if ( ! \current_user_can( 'manage_woocommerce' ) && ! \current_user_can( 'manage_options' ) ) {
			\wp_die( \esc_html__( 'You do not have permission to do this.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		$key = isset( $_GET['notice'] ) ? \sanitize_key( \wp_unslash( $_GET['notice'] ) ) : '';
		if ( '' === $key ) {
			\wp_safe_redirect( \admin_url() );
			exit;
		}
		\check_admin_referer( self::DISMISS_ACTION . '_' . $key );
		\update_user_meta( \get_current_user_id(), self::DISMISS_META_PREFIX . $key, 1 );

		$back = \wp_get_referer();
		\wp_safe_redirect( $back ? $back : \admin_url() );
		exit;
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	/**
	 * Count `sgs_product` CPT entries (any status bar trash/auto-draft). Reliable
	 * even when the CPT is not registered (direct count by post_type string).
	 *
	 * @return int
	 */
	private static function cpt_product_count(): int {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- admin-notice render; the CPT may be unregistered so a direct count is the reliable signal.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = %s AND post_status NOT IN ( 'trash', 'auto-draft' )",
				Product_CPT::POST_TYPE
			)
		);
	}
}
