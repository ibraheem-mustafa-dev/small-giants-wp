<?php
/**
 * SGS Template Part Resetter — FR-S2-3.
 *
 * Exposes an admin page under SGS → Reset Header/Footer that lets operators
 * manually re-seed their header and/or footer wp_template_part records from the
 * pattern declared by the currently active style variation.
 *
 * Single source of truth: all seeding logic delegates to the three PUBLIC helpers
 * on {@see Sgs_Template_Part_Seeder} — resolve_pattern_slugs(), get_pattern_content(),
 * and get_active_variation_slug(). The private seed_area() on the Seeder is NOT
 * duplicated here; the resetter calls only the seeder's public API.
 *
 * Note: Sgs_Template_Part_Seeder::get_active_variation_slug() requires a
 * wp_global_styles post ID. Because this class runs in an admin-POST context (no
 * save_post hook), we resolve the post ID using
 * WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles() — the same server-
 * side resolver that the variation picker uses (Council N1).
 *
 * FR-S5-3 (future WP-CLI command) should call Sgs_Template_Part_Resetter::reset()
 * directly, passing a trusted internal context. The method is a public static so the
 * CLI shim needs no visibility workaround.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Template_Part_Resetter
 */
final class Sgs_Template_Part_Resetter {

	/** Nonce action for the reset form. */
	const NONCE_ACTION = 'sgs_reset_template_parts';

	/** Nonce form-field name. */
	const NONCE_NAME = 'sgs_reset_nonce';

	/** Admin-post.php action name. */
	const ACTION = 'sgs_reset_template_parts';

	/** Submenu slug. */
	const PAGE_SLUG = 'sgs-reset-template-parts';

	/** Capability required at every entry point. */
	const CAP = 'edit_theme_options';

	/** Post-type constant (mirrors seeder — avoids coupling to its private const). */
	private const POST_TYPE = 'wp_template_part';

	/**
	 * Wire WP hooks. Idempotent — safe to call from plugin bootstrap.
	 */
	public static function register(): void {
		\add_action( 'admin_menu', array( self::class, 'register_submenu' ) );
		\add_action( 'admin_post_' . self::ACTION, array( self::class, 'handle_reset' ) );
	}

	/**
	 * Register the submenu under the SGS top-level menu.
	 */
	public static function register_submenu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Reset Header/Footer', 'sgs-blocks' ),
			\__( 'Reset Header/Footer', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( self::class, 'render_page' )
		);
	}

	/**
	 * Render the reset admin page.
	 *
	 * Outputs a form with radio buttons (header / footer / both) and a submit
	 * button that triggers a JS confirmation dialog before posting. The
	 * confirmation wording matches FR-S2-3 spec exactly.
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die(
				\esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ),
				'',
				array( 'response' => 403 )
			);
		}

		$variation_name = self::get_active_variation_name();

		// Flash notice from previous redirect.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$flash = isset( $_GET['sgs_flash'] ) ? \sanitize_key( \wp_unslash( (string) $_GET['sgs_flash'] ) ) : '';

		echo '<div class="wrap">';
		echo '<h1>' . \esc_html__( 'Reset Header / Footer', 'sgs-blocks' ) . '</h1>';

		if ( 'reset_ok' === $flash ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . \esc_html__( 'Header/footer reset successfully.', 'sgs-blocks' ) . '</p></div>';
		} elseif ( 'reset_err' === $flash ) {
			echo '<div class="notice notice-error is-dismissible"><p>' . \esc_html__( 'Reset failed — check the error log for details.', 'sgs-blocks' ) . '</p></div>';
		} elseif ( 'no_variation' === $flash ) {
			echo '<div class="notice notice-error is-dismissible"><p>' . \esc_html__( 'No active style variation found. Activate a variation first.', 'sgs-blocks' ) . '</p></div>';
		}

		/*
		 * Confirm dialog wording (spec FR-S2-3):
		 * "This will replace your current header and footer with the {variation-name}
		 * pattern. Site Info data is safe. Continue?"
		 */
		$confirm_msg = sprintf(
			/* translators: %s: style variation name */
			\__(
				'This will replace your current header and footer with the %s pattern. Site Info data is safe. Continue?',
				'sgs-blocks'
			),
			$variation_name
		);

		$action_url = \admin_url( 'admin-post.php' );

		echo '<p>' . \esc_html__( 'Replace the header and/or footer template part with the pattern from the currently active style variation.', 'sgs-blocks' ) . '</p>';

		echo '<form method="post" action="' . \esc_url( $action_url ) . '">';
		echo '<input type="hidden" name="action" value="' . \esc_attr( self::ACTION ) . '" />';
		\wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );

		echo '<fieldset>';
		echo '<legend>' . \esc_html__( 'Area to reset', 'sgs-blocks' ) . '</legend>';

		foreach ( array( 'header', 'footer', 'both' ) as $option ) {
			$label = 'both' === $option ? \__( 'Both header and footer', 'sgs-blocks' ) : \ucfirst( $option );
			printf(
				'<label style="display:block;margin:4px 0;"><input type="radio" name="sgs_reset_area" value="%s"%s> %s</label>',
				\esc_attr( $option ),
				'both' === $option ? ' checked' : '',
				\esc_html( $label )
			);
		}

		echo '</fieldset>';
		echo '<br>';

		printf(
			'<button type="submit" class="button button-primary" onclick="return confirm(%s);">%s</button>',
			\esc_attr( \wp_json_encode( $confirm_msg ) ),
			\esc_html__( 'Reset', 'sgs-blocks' )
		);

		echo '</form>';
		echo '</div>';
	}

	/**
	 * Handle the reset POST (admin-post.php action).
	 *
	 * Verifies nonce + capability, reads the area from $_POST, calls reset(),
	 * then redirects back with a flash notice.
	 */
	public static function handle_reset(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die(
				\esc_html__( 'You do not have permission to perform this action.', 'sgs-blocks' ),
				'',
				array( 'response' => 403 )
			);
		}

		if ( ! isset( $_POST[ self::NONCE_NAME ] ) ||
			! \wp_verify_nonce( \wp_unslash( (string) $_POST[ self::NONCE_NAME ] ), self::NONCE_ACTION ) // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		) {
			\wp_die(
				\esc_html__( 'Nonce verification failed.', 'sgs-blocks' ),
				'',
				array( 'response' => 403 )
			);
		}

		$raw_area = isset( $_POST['sgs_reset_area'] ) ? \sanitize_key( \wp_unslash( (string) $_POST['sgs_reset_area'] ) ) : 'both';
		$area     = \in_array( $raw_area, array( 'header', 'footer', 'both' ), true ) ? $raw_area : 'both';

		$ok    = self::reset( $area );
		$flash = $ok ? 'reset_ok' : 'reset_err';

		\wp_safe_redirect( \admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&sgs_flash=' . $flash ) );
		exit;
	}

	/**
	 * Public helper — seeds one or both template-part areas from the currently
	 * active style variation. Called by handle_reset() and available for the
	 * future FR-S5-3 WP-CLI command.
	 *
	 * Does NOT perform a capability check internally — callers are expected to
	 * gate access before invoking (handle_reset does; a trusted CLI context does
	 * not need it). This mirrors the pattern used by Sgs_Site_Info::set_internal.
	 *
	 * @param string $area One of 'header', 'footer', 'both'. Defaults to 'both'.
	 * @return bool True when all requested areas were written; false on any failure.
	 */
	public static function reset( string $area = 'both' ): bool {
		$variation_slug = self::resolve_active_variation_slug();

		if ( '' === $variation_slug ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log( 'SGS Template Part Resetter: no active variation found — nothing to reset.' );
			return false;
		}

		try {
			$patterns = Sgs_Template_Part_Seeder::resolve_pattern_slugs( $variation_slug );
		} catch ( \Throwable $e ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log( 'SGS Template Part Resetter: resolve_pattern_slugs failed — ' . $e->getMessage() );
			return false;
		}

		$areas  = ( 'both' === $area ) ? array( 'header', 'footer' ) : array( $area );
		$all_ok = true;

		foreach ( $areas as $part ) {
			$pattern_slug = $patterns[ $part ] ?? '';
			$ok           = self::write_area( $part, $pattern_slug, $variation_slug );
			if ( ! $ok ) {
				$all_ok = false;
			}
		}

		return $all_ok;
	}

	// -----------------------------------------------------------------------
	// Private helpers.
	// -----------------------------------------------------------------------

	/**
	 * Resolve the active variation slug without a save_post post-ID context.
	 *
	 * Uses WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles() to
	 * locate the canonical user-styles post, then delegates to
	 * Sgs_Template_Part_Seeder::get_active_variation_slug().
	 *
	 * @return string Variation slug, or '' when none found.
	 */
	private static function resolve_active_variation_slug(): string {
		if ( isset( $GLOBALS['sgs_test_active_variation'] ) && \is_string( $GLOBALS['sgs_test_active_variation'] ) ) {
			return $GLOBALS['sgs_test_active_variation'];
		}

		if ( ! \class_exists( '\\WP_Theme_JSON_Resolver' ) ||
			! \method_exists( '\\WP_Theme_JSON_Resolver', 'get_user_data_from_wp_global_styles' )
		) {
			return '';
		}

		$user_post = \WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( \wp_get_theme(), true );
		if ( ! \is_object( $user_post ) || empty( $user_post->ID ) ) {
			return '';
		}

		return Sgs_Template_Part_Seeder::get_active_variation_slug( (int) $user_post->ID );
	}

	/**
	 * Write one template-part area (header or footer) unconditionally.
	 *
	 * Unlike the Seeder's seed_area(), this method does NOT skip on meta-match —
	 * the operator explicitly requested a reset, so we always overwrite.
	 *
	 * @param string $area           'header' or 'footer'.
	 * @param string $pattern_slug   Pattern slug to write.
	 * @param string $variation_slug Active variation slug (for meta tracking).
	 * @return bool True on success; false when the template part could not be written.
	 */
	private static function write_area( string $area, string $pattern_slug, string $variation_slug ): bool {
		$content = Sgs_Template_Part_Seeder::get_pattern_content( $pattern_slug );

		if ( '' === $content ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log( "SGS Template Part Resetter: pattern '{$pattern_slug}' not registered — skipping {$area}." );
			return false;
		}

		$existing = self::find_template_part( $area );
		$args     = array(
			'post_type'    => self::POST_TYPE,
			'post_status'  => 'publish',
			'post_title'   => \ucfirst( $area ),
			'post_name'    => $area,
			'post_content' => $content,
		);

		if ( $existing > 0 ) {
			$args['ID'] = $existing;
			$result     = \wp_update_post( $args, true );
		} else {
			$result = \wp_insert_post( $args, true );
		}

		if ( \is_wp_error( $result ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log( 'SGS Template Part Resetter: post write failed — ' . $result->get_error_message() );
			return false;
		}

		Sgs_Template_Part_Meta::mark_seeded( (int) $result, $pattern_slug, $variation_slug );
		return true;
	}

	/**
	 * Find the wp_template_part post ID for the given area.
	 *
	 * @param string $area 'header' or 'footer'.
	 * @return int Post ID, or 0 when none found.
	 */
	private static function find_template_part( string $area ): int {
		$posts = \get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'posts_per_page' => 1,
				'post_status'    => array( 'publish', 'draft', 'auto-draft' ),
				'tax_query'      => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
					array(
						'taxonomy' => 'wp_template_part_area',
						'field'    => 'name',
						'terms'    => $area,
					),
				),
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		if ( ! \is_array( $posts ) || empty( $posts ) ) {
			return 0;
		}
		return (int) $posts[0];
	}

	/**
	 * Return a human-readable label for the active style variation.
	 *
	 * Used in the confirmation dialog. Falls back to 'default' when no
	 * variation can be resolved.
	 *
	 * @return string Variation display name.
	 */
	private static function get_active_variation_name(): string {
		$slug = self::resolve_active_variation_slug();
		if ( '' === $slug ) {
			return \__( 'default', 'sgs-blocks' );
		}
		// Convert slug to a readable label (e.g. "mamas-munches" → "Mamas Munches").
		return \ucwords( \str_replace( '-', ' ', $slug ) );
	}
}
