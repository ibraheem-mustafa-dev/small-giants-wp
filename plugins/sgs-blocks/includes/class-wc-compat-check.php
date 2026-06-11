<?php
/**
 * SGS WooCommerce compatibility self-check (Spec 30 FR-30-0a).
 *
 * Performs a runtime compatibility audit on every admin page load and surfaces
 * a single dismissible notice when WooCommerce is outside the tested band or
 * relied-on blocks are missing from the registry.
 *
 * Written contract (tested version band + relied-on block list):
 *   plugins/sgs-blocks/WC-DEPENDENCY-MANIFEST.md
 *
 * IMPORTANT: This file MUST NOT reference any WooCommerce class or constant at
 * file scope. The plugin bootstrapper loads includes alphabetically — sgs-blocks
 * loads before woocommerce. Any file-scope `extends \WC_*` fatals the entire
 * site on load. ALL WC checks are deferred into the admin_notices callback.
 *
 * @package SGS\Blocks
 * @since   1.7.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Wc_Compat_Check
 *
 * Registers two hooks on init():
 *  - admin_init  — handles the GET-actioned dismissal (nonce-verified, capability-checked).
 *  - admin_notices — runs the version-band + block-registry checks, outputs one notice.
 */
final class Wc_Compat_Check {

	// ── Tested version band ────────────────────────────────────────────────────
	// Keep in sync with plugins/sgs-blocks/WC-DEPENDENCY-MANIFEST.md.

	/** Minimum WooCommerce version that SGS blocks have been tested against. */
	const WC_TESTED_FLOOR = '9.9.0';

	/**
	 * Maximum tested WooCommerce version (major.minor ceiling).
	 *
	 * Out-of-band when the installed WC major.minor exceeds this value.
	 */
	const WC_TESTED_CEILING = '10.8';

	// ── Relied-on WC blocks ────────────────────────────────────────────────────
	// Keep in sync with plugins/sgs-blocks/WC-DEPENDENCY-MANIFEST.md.

	/**
	 * WooCommerce blocks that SGS product pages depend on being registered.
	 *
	 * Checked via WP_Block_Type_Registry — a missing block surfaces in the notice.
	 *
	 * @var string[]
	 */
	const RELIED_ON_BLOCKS = array(
		'woocommerce/product-gallery',
		'woocommerce/product-gallery-large-image',
		'woocommerce/product-gallery-large-image-next-previous',
		'woocommerce/product-gallery-thumbnails',
		'woocommerce/add-to-cart-with-options',
		'woocommerce/mini-cart',
		'woocommerce/product-collection',
		'woocommerce/product-filters',
		'woocommerce/active-filters',
		'woocommerce/cart',
		'woocommerce/checkout',
		'woocommerce/breadcrumbs',
		'woocommerce/product-price',
		'woocommerce/product-rating',
		'woocommerce/product-image-gallery',
	);

	// ── Dismissal ──────────────────────────────────────────────────────────────

	/** WP options key that stores the WC version string at dismissal time. */
	const DISMISS_OPTION = 'sgs_wc_compat_dismissed';

	/** GET parameter name for the dismiss action. */
	const DISMISS_PARAM = 'sgs_wc_compat_dismiss';

	/** Nonce action prefix — appended with the current WC version. */
	const NONCE_ACTION = 'sgs_wc_compat_dismiss_';

	// ── Bootstrap ─────────────────────────────────────────────────────────────

	/**
	 * Register WP hooks. Called once from the plugin bootstrap (sgs-blocks.php).
	 *
	 * Hook registration at file-load time is safe; WC checks are inside callbacks.
	 */
	public static function init(): void {
		\add_action( 'admin_init', array( __CLASS__, 'handle_dismiss' ) );
		\add_action( 'admin_notices', array( __CLASS__, 'maybe_show_notice' ) );
	}

	// ── Notice ─────────────────────────────────────────────────────────────────

	/**
	 * Run the compatibility checks and output one admin notice when needed.
	 *
	 * Bail conditions (all must pass):
	 *  - WooCommerce class must exist.
	 *  - WC_VERSION constant must be defined.
	 *  - Current user must have manage_options.
	 */
	public static function maybe_show_notice(): void {
		if ( ! \class_exists( 'WooCommerce' ) ) {
			return;
		}
		if ( ! \defined( 'WC_VERSION' ) ) {
			return;
		}
		if ( ! \current_user_can( 'manage_options' ) ) {
			return;
		}

		$wc_version = (string) \WC_VERSION;

		// Suppress when previously dismissed for this exact WC version.
		if ( self::is_dismissed( $wc_version ) ) {
			return;
		}

		// ── Version band check ──────────────────────────────────────────────
		$below_floor   = \version_compare( $wc_version, self::WC_TESTED_FLOOR, '<' );
		$above_ceiling = self::is_above_ceiling( $wc_version );
		$out_of_band   = $below_floor || $above_ceiling;

		// ── Missing block check ─────────────────────────────────────────────
		$registry       = \WP_Block_Type_Registry::get_instance();
		$missing_blocks = array();
		foreach ( self::RELIED_ON_BLOCKS as $block_name ) {
			if ( ! $registry->is_registered( $block_name ) ) {
				$missing_blocks[] = $block_name;
			}
		}

		// No issues — nothing to show.
		if ( ! $out_of_band && empty( $missing_blocks ) ) {
			return;
		}

		self::render_notice( $wc_version, $out_of_band, $missing_blocks );
	}

	// ── Rendering ──────────────────────────────────────────────────────────────

	/**
	 * Output the compatibility notice markup.
	 *
	 * One notice regardless of how many issues were found. All user-facing strings
	 * are UK English, translatable, and fully escaped on output.
	 *
	 * @param string   $wc_version    Installed WooCommerce version string.
	 * @param bool     $out_of_band   Whether the version is outside the tested band.
	 * @param string[] $missing_blocks Block names absent from the registry.
	 */
	private static function render_notice( string $wc_version, bool $out_of_band, array $missing_blocks ): void {
		$dismiss_url = \wp_nonce_url(
			\add_query_arg( self::DISMISS_PARAM, '1' ),
			self::NONCE_ACTION . $wc_version
		);

		echo '<div class="notice notice-warning is-dismissible">';
		echo '<p>';

		if ( $out_of_band ) {
			echo \esc_html(
				\sprintf(
					/* translators: %s: the installed WooCommerce version string. */
					\__( 'SGS: WooCommerce %s is newer/older than tested — product pages may need review.', 'sgs-blocks' ),
					$wc_version
				)
			);
		}

		if ( ! empty( $missing_blocks ) ) {
			if ( $out_of_band ) {
				echo '<br />';
			}
			echo \esc_html(
				\sprintf(
					/* translators: %s: comma-separated list of missing WooCommerce block names. */
					\__( 'The following WooCommerce blocks are not registered and may affect product page functionality: %s', 'sgs-blocks' ),
					implode( ', ', $missing_blocks )
				)
			);
		}

		echo '</p>';
		echo '<p><a href="' . \esc_url( $dismiss_url ) . '">' . \esc_html__( 'Dismiss this notice', 'sgs-blocks' ) . '</a></p>';
		echo '</div>';
	}

	// ── Dismissal handler ──────────────────────────────────────────────────────

	/**
	 * Handle the GET-actioned dismissal request on admin_init.
	 *
	 * Stores the current WC_VERSION string in options. When that stored value
	 * matches the installed WC version, the notice is suppressed. A WC upgrade
	 * produces a different version string and re-surfaces the notice automatically.
	 *
	 * Security: nonce-verified, capability-checked, input sanitised.
	 */
	public static function handle_dismiss(): void {
		// Admin-only: this handler is hooked on admin_init, but guard explicitly so
		// the static performance scanner never flags the update_option call below as
		// a possible frontend DB write.
		if ( ! \is_admin() ) {
			return;
		}
		if ( ! isset( $_GET[ self::DISMISS_PARAM ] ) ) {
			return;
		}
		if ( ! \current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! \defined( 'WC_VERSION' ) ) {
			return;
		}

		$wc_version = (string) \WC_VERSION;

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- checked via wp_verify_nonce below.
		if ( ! isset( $_GET['_wpnonce'] ) || ! \wp_verify_nonce( \sanitize_text_field( \wp_unslash( $_GET['_wpnonce'] ) ), self::NONCE_ACTION . $wc_version ) ) {
			\wp_die( \esc_html__( 'Security check failed.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		// phpcs:ignore WordPressVIPMinimum.Functions.RestrictedFunctions.update_option_update_option -- admin_init hook; is_admin() guard above ensures this never runs on the frontend.
		\update_option( self::DISMISS_OPTION, \sanitize_text_field( $wc_version ), false );

		// Redirect back to the same page without the dismiss query arg.
		$redirect = \remove_query_arg( array( self::DISMISS_PARAM, '_wpnonce' ) );
		\wp_safe_redirect( $redirect );
		exit;
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	/**
	 * Whether the notice has been dismissed for the given WC version.
	 *
	 * Compares the stored option value (the WC version at dismissal time) against
	 * the current version. Different versions → not dismissed.
	 *
	 * @param string $wc_version Installed WooCommerce version string.
	 * @return bool
	 */
	private static function is_dismissed( string $wc_version ): bool {
		$stored = \get_option( self::DISMISS_OPTION, '' );
		return \is_string( $stored ) && $stored === $wc_version;
	}

	/**
	 * Whether the installed WC version's major.minor exceeds the tested ceiling.
	 *
	 * Ceiling comparison uses major.minor only (e.g. 10.8) so patch releases within
	 * the tested band do not trigger a false out-of-band warning.
	 *
	 * @param string $wc_version Installed WooCommerce version string (e.g. '10.9.1').
	 * @return bool
	 */
	private static function is_above_ceiling( string $wc_version ): bool {
		// Integer arithmetic, NOT float concatenation — "10.10" as a float is 10.1,
		// which would silently pass a 10.10 release under a 10.8 ceiling.
		$parts   = explode( '.', $wc_version );
		$major   = isset( $parts[0] ) ? (int) $parts[0] : 0;
		$minor   = isset( $parts[1] ) ? (int) $parts[1] : 0;
		$current = ( $major * 10000 ) + $minor;

		$ceiling_parts = explode( '.', self::WC_TESTED_CEILING );
		$ceil_major    = isset( $ceiling_parts[0] ) ? (int) $ceiling_parts[0] : 0;
		$ceil_minor    = isset( $ceiling_parts[1] ) ? (int) $ceiling_parts[1] : 0;
		$ceiling       = ( $ceil_major * 10000 ) + $ceil_minor;

		return $current > $ceiling;
	}
}
