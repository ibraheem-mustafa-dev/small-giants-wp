<?php
/**
 * SGS Style Variation Picker (FR-S5-2, Spec 17 Wave 2).
 *
 * Renders an admin page under SGS → Style Variations that lists every
 * registered style variation for the active theme and lets operators activate
 * one. Writes the chosen variation's JSON into the canonical
 * `wp_global_styles` post for the current theme — the post WordPress itself
 * looks up via {@see \WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles()}.
 *
 * Security gates (Council N1):
 *   - Capability check via `edit_theme_options` on every request boundary.
 *   - Nonce check on the activate POST handler.
 *   - The target `wp_global_styles` post ID is resolved server-side from the
 *     resolver. Any `post_id` submitted in `$_POST` is ignored. An attacker who
 *     forges a different post ID writes nothing to that post — the handler
 *     only ever touches the resolver's canonical post.
 *
 * Legacy theme_mod migration is handled by
 * {@see Sgs_Legacy_Theme_Mod_Migrator}, which is wired in via
 * {@see Sgs_Variation_Picker::register()}.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Variation_Picker
 */
final class Sgs_Variation_Picker {

	/** Submenu page slug under the SGS top-level menu. */
	const ADMIN_PAGE = 'sgs-variation-picker';

	/** Nonce action — also the admin-post action name. */
	const NONCE_ACTION = 'sgs_activate_variation';

	/** Nonce form field name. */
	const NONCE_NAME = 'sgs_variation_picker_nonce';

	/** Capability required for every entry point. */
	const CAP = 'edit_theme_options';

	/**
	 * Wire WP hooks. Safe to call from sgs-blocks.php bootstrap. Idempotent —
	 * add_action de-duplicates per callback.
	 */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'register_submenu' ), 10 );
		\add_action( 'admin_post_' . self::NONCE_ACTION, array( __CLASS__, 'handle_activate' ) );
		Sgs_Legacy_Theme_Mod_Migrator::register();
	}

	/**
	 * Register the submenu under the SGS top-level menu (FR-S5-1).
	 */
	public static function register_submenu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Style Variations', 'sgs-blocks' ),
			\__( 'Style Variations', 'sgs-blocks' ),
			self::CAP,
			self::ADMIN_PAGE,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Render the picker page. Bails for users without `edit_theme_options`.
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		$variations = self::get_variations();

		echo '<div class="wrap">';
		echo '<h1>' . \esc_html__( 'SGS Style Variations', 'sgs-blocks' ) . '</h1>';

		// Flash notice from previous redirect — no nonce required, the value is a fixed enum coerced via sanitize_key.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$flash = isset( $_GET['sgs_flash'] ) ? \sanitize_key( \wp_unslash( (string) $_GET['sgs_flash'] ) ) : '';
		if ( 'activated' === $flash ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . \esc_html__( 'Style variation activated.', 'sgs-blocks' ) . '</p></div>';
		} elseif ( 'not_found' === $flash ) {
			echo '<div class="notice notice-error is-dismissible"><p>' . \esc_html__( 'That style variation is not registered for this theme.', 'sgs-blocks' ) . '</p></div>';
		} elseif ( 'no_user_post' === $flash ) {
			echo '<div class="notice notice-error is-dismissible"><p>' . \esc_html__( 'Unable to resolve the user-styles post for the current theme.', 'sgs-blocks' ) . '</p></div>';
		}

		if ( empty( $variations ) ) {
			echo '<p>' . \esc_html__( 'No style variations are registered for the active theme.', 'sgs-blocks' ) . '</p>';
			echo '</div>';
			return;
		}

		echo '<p>' . \esc_html__( 'Pick a variation and click Activate. The chosen variation is written to the canonical user styles post for this theme.', 'sgs-blocks' ) . '</p>';

		$action_url = \admin_url( 'admin-post.php' );

		echo '<form method="post" action="' . \esc_url( $action_url ) . '">';
		echo '<input type="hidden" name="action" value="' . \esc_attr( self::NONCE_ACTION ) . '" />';
		\wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );

		echo '<table class="form-table" role="presentation"><tbody><tr>';
		echo '<th scope="row"><label for="sgs_variation_slug">' . \esc_html__( 'Style variation', 'sgs-blocks' ) . '</label></th>';
		echo '<td><select id="sgs_variation_slug" name="sgs_variation_slug">';
		foreach ( $variations as $variation ) {
			$slug  = isset( $variation['slug'] ) ? (string) $variation['slug'] : '';
			$title = isset( $variation['title'] ) ? (string) $variation['title'] : $slug;
			if ( '' === $slug ) {
				continue;
			}
			echo '<option value="' . \esc_attr( $slug ) . '">' . \esc_html( $title ) . '</option>';
		}
		echo '</select></td>';
		echo '</tr></tbody></table>';

		\submit_button( \__( 'Activate variation', 'sgs-blocks' ) );

		echo '</form>';
		echo '</div>';
	}

	/**
	 * Handle the activate POST. Council N1: `post_id` is NEVER read from $_POST.
	 * The target post ID is resolved server-side from
	 * \WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles().
	 */
	public static function handle_activate(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to perform this action.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		\check_admin_referer( self::NONCE_ACTION, self::NONCE_NAME );

		$slug = isset( $_POST['sgs_variation_slug'] ) ? \sanitize_key( \wp_unslash( (string) $_POST['sgs_variation_slug'] ) ) : '';

		// Council N1 — resolver-only lookup of canonical wp_global_styles post.
		// Any $_POST['post_id'] is intentionally NOT consulted.
		$user_styles_post = \WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( \wp_get_theme(), true );
		$target_post_id   = is_object( $user_styles_post ) && isset( $user_styles_post->ID ) ? (int) $user_styles_post->ID : 0;

		if ( $target_post_id <= 0 ) {
			self::redirect_with_flash( 'no_user_post' );
			return;
		}

		$variation = self::find_variation_by_slug( $slug );
		if ( null === $variation ) {
			self::redirect_with_flash( 'not_found' );
			return;
		}

		$post_content = \wp_json_encode( self::strip_meta_from_variation( $variation ) );
		if ( false === $post_content ) {
			self::redirect_with_flash( 'not_found' );
			return;
		}

		\wp_update_post(
			array(
				'ID'           => $target_post_id,
				'post_content' => \wp_slash( $post_content ),
			)
		);

		self::redirect_with_flash( 'activated' );
	}

	// ─── Internal helpers ───────────────────────────────────────────────────

	/**
	 * Return the list of style variations for the active theme.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private static function get_variations(): array {
		if ( ! class_exists( '\WP_Theme_JSON_Resolver' ) ) {
			return array();
		}
		$variations = \WP_Theme_JSON_Resolver::get_style_variations();
		return is_array( $variations ) ? array_values( $variations ) : array();
	}

	/**
	 * Find a registered variation by its slug.
	 *
	 * @param string $slug Variation slug.
	 * @return array<string,mixed>|null
	 */
	private static function find_variation_by_slug( string $slug ): ?array {
		if ( '' === $slug ) {
			return null;
		}
		foreach ( self::get_variations() as $variation ) {
			if ( isset( $variation['slug'] ) && (string) $variation['slug'] === $slug ) {
				return $variation;
			}
		}
		return null;
	}

	/**
	 * Strip metadata-only keys from a variation before persisting. The
	 * `slug` / `title` / `description` keys are registry-side metadata and
	 * should not be written into the user-styles post content.
	 *
	 * @param array<string,mixed> $variation Variation array.
	 * @return array<string,mixed>
	 */
	private static function strip_meta_from_variation( array $variation ): array {
		unset( $variation['slug'], $variation['title'], $variation['description'] );
		return $variation;
	}

	/**
	 * Redirect back to the picker page with a flash code.
	 *
	 * @param string $code Flash status code (activated|not_found|no_user_post).
	 */
	private static function redirect_with_flash( string $code ): void {
		$url = \add_query_arg(
			array(
				'page'      => self::ADMIN_PAGE,
				'sgs_flash' => $code,
			),
			\admin_url( 'admin.php' )
		);
		\wp_safe_redirect( $url );
		// Allow test environments to bypass exit by setting this constant.
		if ( ! defined( 'SGS_BLOCKS_TESTING' ) ) {
			exit;
		}
	}

	/**
	 * Current timestamp. Wrapped so tests can swap in a fixed value via the
	 * `sgs_test_now` global.
	 */
	private static function now(): int {
		if ( isset( $GLOBALS['sgs_test_now'] ) ) {
			return (int) $GLOBALS['sgs_test_now'];
		}
		return time();
	}
}
