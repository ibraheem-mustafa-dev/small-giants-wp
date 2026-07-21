<?php
/**
 * Admin UI for the active header/footer pointer (FR-37-2, FR-37-5, FR-37-25).
 *
 * Adds to both CPT list tables:
 *   - an "Active" column, so an operator holding several saved headers can see
 *     which one is live without opening each (FR-37-5);
 *   - a "Set as active" row action (FR-37-2);
 *   - a "Clear active" row action on the currently-active row, which restores
 *     the immutable framework default and doubles as the rollback (FR-37-25).
 *
 * Every state change goes through `admin_post_*` with BOTH a nonce and a
 * capability check, and writes only via {@see Sgs_Active_Layout}. Nothing here
 * is reachable from a frontend request.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Active_Layout_Admin
 *
 * List-table integration + the set/clear action handlers.
 */
final class Sgs_Active_Layout_Admin {

	/** `admin_post` action name for setting a layout active. */
	private const ACTION_SET = 'sgs_set_active_layout';

	/** `admin_post` action name for clearing the active layout. */
	private const ACTION_CLEAR = 'sgs_clear_active_layout';

	/** Capability required to change the active layout. Matches the CPT caps. */
	private const CAP = 'edit_theme_options';

	/** Query arg carrying the result of a set/clear action back to the list table. */
	private const NOTICE_ARG = 'sgs_active_layout_notice';

	/**
	 * Wire WordPress hooks. Admin-only by construction — every hook below is
	 * an admin hook, so this class is inert on a frontend request.
	 */
	public static function register(): void {
		foreach ( self::areas() as $post_type ) {
			\add_filter( "manage_{$post_type}_posts_columns", array( __CLASS__, 'add_active_column' ) );
			\add_action( "manage_{$post_type}_posts_custom_column", array( __CLASS__, 'render_active_column' ), 10, 2 );
		}

		\add_filter( 'post_row_actions', array( __CLASS__, 'add_row_actions' ), 10, 2 );
		\add_filter( 'display_post_states', array( __CLASS__, 'add_post_state' ), 10, 2 );
		\add_action( 'admin_post_' . self::ACTION_SET, array( __CLASS__, 'handle_set' ) );
		\add_action( 'admin_post_' . self::ACTION_CLEAR, array( __CLASS__, 'handle_clear' ) );
		\add_action( 'admin_notices', array( __CLASS__, 'render_notice' ) );
	}

	/**
	 * Area token => post type slug, for the two CPTs this class governs.
	 *
	 * @return array<string,string>
	 */
	private static function areas(): array {
		return array(
			Sgs_Active_Layout::AREA_HEADER => Sgs_Block_CPTs::HEADER_CPT,
			Sgs_Active_Layout::AREA_FOOTER => Sgs_Block_CPTs::FOOTER_CPT,
		);
	}

	/**
	 * Resolve a post type slug back to its area token.
	 *
	 * @param string $post_type Post type slug.
	 * @return string Area token, or '' when the post type is not ours.
	 */
	private static function area_for_post_type( string $post_type ): string {
		foreach ( self::areas() as $area => $slug ) {
			if ( $slug === $post_type ) {
				return $area;
			}
		}
		return '';
	}

	/**
	 * Insert the Active column immediately after the title.
	 *
	 * @param array<string,string> $columns Existing columns.
	 * @return array<string,string>
	 */
	public static function add_active_column( array $columns ): array {
		$out = array();
		foreach ( $columns as $key => $label ) {
			$out[ $key ] = $label;
			if ( 'title' === $key ) {
				$out['sgs_active'] = \__( 'Active', 'sgs-blocks' );
			}
		}
		// Title column absent (unlikely, but do not silently drop the column).
		if ( ! isset( $out['sgs_active'] ) ) {
			$out['sgs_active'] = \__( 'Active', 'sgs-blocks' );
		}
		return $out;
	}

	/**
	 * Render the Active cell.
	 *
	 * Reads the STORED id rather than the validated one on purpose: if the
	 * active post has been trashed, the operator needs to see that this row is
	 * the one that was pointed at, which is the whole explanation for why their
	 * site reverted to the default header.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Row post id.
	 */
	public static function render_active_column( $column, $post_id ): void {
		if ( 'sgs_active' !== $column ) {
			return;
		}
		$area = self::area_for_post_type( (string) \get_post_type( (int) $post_id ) );
		if ( '' === $area ) {
			return;
		}

		if ( Sgs_Active_Layout::get_stored_id( $area ) !== (int) $post_id ) {
			echo '<span aria-hidden="true">—</span><span class="screen-reader-text">'
				. \esc_html__( 'Not active', 'sgs-blocks' ) . '</span>';
			return;
		}

		if ( Sgs_Active_Layout::get_active_id( $area ) === (int) $post_id ) {
			echo '<strong>' . \esc_html__( 'Active', 'sgs-blocks' ) . '</strong>';
			return;
		}

		// Pointed at, but not renderable — say so rather than showing "Active"
		// next to a header the site is not actually using.
		echo '<strong>' . \esc_html__( 'Active (not published — default is showing)', 'sgs-blocks' ) . '</strong>';
	}

	/**
	 * Add "Set as active" / "Clear active" row actions.
	 *
	 * @param array<string,string> $actions Existing row actions.
	 * @param \WP_Post             $post    Row post.
	 * @return array<string,string>
	 */
	public static function add_row_actions( $actions, $post ): array {
		$actions = is_array( $actions ) ? $actions : array();
		if ( ! $post instanceof \WP_Post ) {
			return $actions;
		}
		$area = self::area_for_post_type( (string) $post->post_type );
		if ( '' === $area || ! \current_user_can( self::CAP ) ) {
			return $actions;
		}

		if ( Sgs_Active_Layout::get_stored_id( $area ) === (int) $post->ID ) {
			$actions['sgs_clear_active'] = sprintf(
				'<a href="%s">%s</a>',
				\esc_url( self::action_url( self::ACTION_CLEAR, $area, (int) $post->ID ) ),
				\esc_html__( 'Clear active', 'sgs-blocks' )
			);
			return $actions;
		}

		if ( 'publish' !== $post->post_status ) {
			return $actions;
		}

		$actions['sgs_set_active'] = sprintf(
			'<a href="%s">%s</a>',
			\esc_url( self::action_url( self::ACTION_SET, $area, (int) $post->ID ) ),
			\esc_html__( 'Set as active', 'sgs-blocks' )
		);
		return $actions;
	}

	/**
	 * Show an "Active" post state next to the title, matching how WordPress
	 * labels the front page and posts page.
	 *
	 * @param array<int|string,string> $states Existing states.
	 * @param \WP_Post                 $post   Row post.
	 * @return array<int|string,string>
	 */
	public static function add_post_state( $states, $post ): array {
		$states = is_array( $states ) ? $states : array();
		if ( ! $post instanceof \WP_Post ) {
			return $states;
		}
		$area = self::area_for_post_type( (string) $post->post_type );
		if ( '' !== $area && Sgs_Active_Layout::get_active_id( $area ) === (int) $post->ID ) {
			$states['sgs_active'] = \__( 'Active', 'sgs-blocks' );
		}
		return $states;
	}

	/**
	 * Build a nonce-protected admin-post URL for a set/clear action.
	 *
	 * @param string $action  Action name.
	 * @param string $area    Area token.
	 * @param int    $post_id Target post id.
	 * @return string
	 */
	private static function action_url( string $action, string $area, int $post_id ): string {
		return \wp_nonce_url(
			\add_query_arg(
				array(
					'action'  => $action,
					'area'    => $area,
					'post_id' => $post_id,
				),
				\admin_url( 'admin-post.php' )
			),
			$action . '_' . $post_id
		);
	}

	/**
	 * Validate a set/clear request and return the sanitised (area, post id).
	 *
	 * Dies on a failed capability or nonce check — a state-changing admin
	 * request must never continue past either.
	 *
	 * @param string $action Expected action name.
	 * @return array{0:string,1:int}
	 */
	private static function validate_request( string $action ): array {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to change the active layout.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		$post_id = isset( $_GET['post_id'] ) ? \absint( \wp_unslash( $_GET['post_id'] ) ) : 0;
		\check_admin_referer( $action . '_' . $post_id );

		$area = isset( $_GET['area'] ) ? \sanitize_key( \wp_unslash( $_GET['area'] ) ) : '';
		if ( '' === Sgs_Active_Layout::option_key( $area ) ) {
			\wp_die( \esc_html__( 'Unknown layout area.', 'sgs-blocks' ), '', array( 'response' => 400 ) );
		}

		return array( $area, $post_id );
	}

	/** Handle "Set as active". */
	public static function handle_set(): void {
		list( $area, $post_id ) = self::validate_request( self::ACTION_SET );

		$result = Sgs_Active_Layout::set_active( $area, $post_id );
		$notice = \is_wp_error( $result ) ? $result->get_error_code() : 'set';

		self::redirect_back( $area, $notice );
	}

	/** Handle "Clear active". */
	public static function handle_clear(): void {
		list( $area, $post_id ) = self::validate_request( self::ACTION_CLEAR );
		unset( $post_id );

		Sgs_Active_Layout::clear_active( $area );
		self::redirect_back( $area, 'cleared' );
	}

	/**
	 * Send the operator back to the list table carrying a result token.
	 *
	 * @param string $area   Area token.
	 * @param string $notice Result token.
	 */
	private static function redirect_back( string $area, string $notice ): void {
		$url = \add_query_arg(
			array(
				'post_type'      => Sgs_Active_Layout::post_type( $area ),
				self::NOTICE_ARG => $notice,
			),
			\admin_url( 'edit.php' )
		);
		\wp_safe_redirect( $url );
		exit;
	}

	/**
	 * Render the result of a set/clear action on the list table.
	 *
	 * Read-only display of a token this class itself set; no state change, so
	 * no nonce is required to read it back.
	 */
	public static function render_notice(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$notice = isset( $_GET[ self::NOTICE_ARG ] ) ? \sanitize_key( \wp_unslash( $_GET[ self::NOTICE_ARG ] ) ) : '';
		if ( '' === $notice ) {
			return;
		}

		$messages = array(
			'set'                             => array( 'success', \__( 'This layout is now active on your site.', 'sgs-blocks' ) ),
			'cleared'                         => array( 'success', \__( 'Active layout cleared — your site is showing the built-in default again.', 'sgs-blocks' ) ),
			'sgs_active_layout_not_found'     => array( 'error', \__( 'That layout could not be found.', 'sgs-blocks' ) ),
			'sgs_active_layout_not_published' => array( 'error', \__( 'Publish this layout before setting it as active.', 'sgs-blocks' ) ),
			'sgs_active_layout_bad_area'      => array( 'error', \__( 'Unknown layout area.', 'sgs-blocks' ) ),
		);

		if ( ! isset( $messages[ $notice ] ) ) {
			return;
		}

		printf(
			'<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
			\esc_attr( $messages[ $notice ][0] ),
			\esc_html( $messages[ $notice ][1] )
		);
	}
}
