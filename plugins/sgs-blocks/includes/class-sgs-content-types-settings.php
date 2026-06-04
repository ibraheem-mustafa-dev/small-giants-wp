<?php
/**
 * SGS Content Types settings — per-site capability flag (Spec 27 FR-24-1 / FR-24 #9).
 *
 * A lean marketing site should pay zero penalty for the product layer: no CPT,
 * no taxonomies, no meta, no admin UI. This class owns the `sgs_content_types`
 * option (an autoloaded array of enabled content-type slugs, default `[]`) and a
 * minimal `manage_options` toggle page so a non-coder can enable the shop with no
 * code. `Product_CPT` reads this flag to gate its own registration.
 *
 * Backward-compat (never a silent break): on the first run after this flag is
 * introduced, a one-time migration auto-enables any content type that ALREADY
 * has content (so existing product sites keep working without manual config).
 *
 * @package SGS\Blocks
 * @since   1.6.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Content_Types_Settings
 */
final class Sgs_Content_Types_Settings {

	/** Autoloaded option: array of enabled content-type slugs (default []). */
	const OPTION = 'sgs_content_types';

	/** One-time backward-compat migration sentinel. */
	const MIGRATED_FLAG = 'sgs_content_types_migrated';

	/** Settings submenu slug. */
	const PAGE_SLUG = 'sgs-content-types';

	/** Capability gate — enabling a whole CPT is an admin-only action. */
	const CAP = 'manage_options';

	/** Action name for the admin-post.php save form. */
	const SAVE_ACTION = 'sgs_content_types_save';

	/**
	 * Toggleable content types: slug => human label. The whitelist that the save
	 * handler validates against (an unknown slug is never written). Extend this as
	 * new SGS content types (testimonial, team, …) land.
	 */
	public static function allowed_types(): array {
		return array(
			Product_CPT::POST_TYPE => \__( 'Products (shop / WooCommerce configurator)', 'sgs-blocks' ),
		);
	}

	/** Wire WP hooks. Called once from the plugin bootstrap. */
	public static function register(): void {
		// init @1 — runs BEFORE Product_CPT's init @5 gate reads the option.
		\add_action( 'init', array( __CLASS__, 'maybe_migrate' ), 1 );
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		\add_action( 'admin_post_' . self::SAVE_ACTION, array( __CLASS__, 'handle_save' ) );
	}

	// ── Public flag API ─────────────────────────────────────────────────────────

	/**
	 * The enabled content-type slugs.
	 *
	 * @return string[]
	 */
	public static function enabled_types(): array {
		$opt = \get_option( self::OPTION, array() );
		return \is_array( $opt ) ? \array_values( \array_filter( \array_map( 'strval', $opt ) ) ) : array();
	}

	/**
	 * Whether a given content type is enabled on this site.
	 *
	 * @param string $type Content-type slug.
	 * @return bool
	 */
	public static function is_enabled( string $type ): bool {
		return \in_array( $type, self::enabled_types(), true );
	}

	/**
	 * Count existing posts of a content type (any status bar trash/auto-draft),
	 * regardless of whether the type is currently registered. Used to warn an
	 * operator before they disable a type that still has content — disabling hides
	 * those posts until re-enabled (never a silent break).
	 *
	 * @param string $type Content-type slug.
	 * @return int
	 */
	private static function content_count( string $type ): int {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- admin-only settings render; the type may be unregistered so a direct count is the reliable signal.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = %s AND post_status NOT IN ( 'trash', 'auto-draft' )",
				$type
			)
		);
	}

	// ── Backward-compat migration ────────────────────────────────────────────────

	/**
	 * One-time migration: if the flag has never been configured, auto-enable any
	 * content type that already has content so an existing site does not silently
	 * lose its CPT when this flag is introduced. Fresh installs migrate to `[]`
	 * (lean). Guarded by an autoloaded sentinel so it runs exactly once.
	 */
	public static function maybe_migrate(): void {
		if ( \get_option( self::MIGRATED_FLAG ) ) {
			return;
		}

		// If an operator already configured the flag explicitly, respect it.
		if ( false !== \get_option( self::OPTION, false ) ) {
			\update_option( self::MIGRATED_FLAG, 1, true );
			return;
		}

		global $wpdb;
		$enabled = array();
		foreach ( \array_keys( self::allowed_types() ) as $type ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- one-time migration count; the CPT may not be registered yet so a direct count is the reliable signal.
			$count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = %s AND post_status NOT IN ( 'trash', 'auto-draft' )",
					$type
				)
			);
			if ( $count > 0 ) {
				$enabled[] = $type;
			}
		}

		\update_option( self::OPTION, $enabled, true );
		\update_option( self::MIGRATED_FLAG, 1, true );
	}

	// ── Admin UI ──────────────────────────────────────────────────────────────────

	/** Register the submenu under the SGS top-level entry. */
	public static function add_menu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'SGS Content Types', 'sgs-blocks' ),
			\__( 'Content Types', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/** Render the toggle page. */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		$status  = isset( $_GET['sgs-status'] ) ? \sanitize_key( \wp_unslash( $_GET['sgs-status'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$enabled = self::enabled_types();

		echo '<div class="wrap">';
		echo '<h1>' . \esc_html__( 'SGS Content Types', 'sgs-blocks' ) . '</h1>';
		echo '<p>' . \esc_html__( 'Turn SGS content types on only where you need them. A site with everything off stays lean — no extra post types, admin screens, or front-end weight.', 'sgs-blocks' ) . '</p>';

		if ( 'saved' === $status ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . \esc_html__( 'Content types updated. The change takes effect immediately.', 'sgs-blocks' ) . '</p></div>';
		}

		echo '<form method="post" action="' . \esc_url( \admin_url( 'admin-post.php' ) ) . '">';
		echo '<input type="hidden" name="action" value="' . \esc_attr( self::SAVE_ACTION ) . '">';
		\wp_nonce_field( self::SAVE_ACTION );

		echo '<table class="form-table" role="presentation"><tbody>';
		foreach ( self::allowed_types() as $slug => $label ) {
			$is_on   = \in_array( $slug, $enabled, true );
			$checked = $is_on ? ' checked' : '';
			$count   = self::content_count( $slug );
			echo '<tr><th scope="row">' . \esc_html( $label ) . '</th><td>';
			echo '<label><input type="checkbox" name="' . \esc_attr( self::OPTION ) . '[]" value="' . \esc_attr( $slug ) . '"' . $checked . '> '; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $checked is a literal ' checked' or ''.
			echo \esc_html__( 'Enabled', 'sgs-blocks' ) . '</label>';
			// Never a silent break: warn before disabling a type that still has content.
			if ( $is_on && $count > 0 ) {
				echo '<p class="description" style="color:#b32d2e">' . \esc_html(
					\sprintf(
						/* translators: %d: number of existing items of this content type. */
						\_n(
							'%d item already exists. Turning this off hides it from your site until you switch it back on — nothing is deleted.',
							'%d items already exist. Turning this off hides them from your site until you switch it back on — nothing is deleted.',
							$count,
							'sgs-blocks'
						),
						$count
					)
				) . '</p>';
			}
			echo '</td></tr>';
		}
		echo '</tbody></table>';

		\submit_button( \__( 'Save changes', 'sgs-blocks' ) );
		echo '</form>';
		echo '</div>';
	}

	/** Handle the save form (admin-post.php). */
	public static function handle_save(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to do this.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::SAVE_ACTION );

		$submitted = isset( $_POST[ self::OPTION ] ) && \is_array( $_POST[ self::OPTION ] )
			? \array_map( 'sanitize_key', \wp_unslash( $_POST[ self::OPTION ] ) ) // phpcs:ignore WordPress.Security.ValidatedSanitized -- sanitize_key applied per element.
			: array();

		// Whitelist: only ever write known, allowed content-type slugs.
		$allowed = \array_keys( self::allowed_types() );
		$clean   = \array_values( \array_intersect( $submitted, $allowed ) );

		\update_option( self::OPTION, $clean, true );
		// Ensure the migration never overwrites an explicit operator choice later.
		\update_option( self::MIGRATED_FLAG, 1, true );

		\wp_safe_redirect(
			\add_query_arg(
				array(
					'page'       => self::PAGE_SLUG,
					'sgs-status' => 'saved',
				),
				\admin_url( 'admin.php' )
			)
		);
		exit;
	}
}
