<?php
/**
 * Admin labelling for seeded framework looks (FR-37-48, Spec 37).
 *
 * On every library CPT list table ({@see Sgs_Starter_Library_Seeder::LIBRARY_AREAS}):
 *   - a "Framework look" post-state beside any post carrying
 *     {@see Sgs_Starter_Library_Seeder::MARKER_META};
 *   - a "Framework looks (N)" view link that filters the list to those posts.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Starter_Library_Admin
 */
final class Sgs_Starter_Library_Admin {

	/** Query var that switches the list table to framework looks only. */
	private const QUERY_VAR = 'sgs_framework_looks';

	/** Key of the added view link. */
	private const VIEW_KEY = 'sgs_framework_looks';

	/**
	 * Wire hooks. Call once from the plugin bootstrap.
	 */
	public static function register(): void {
		\add_filter( 'display_post_states', array( self::class, 'add_post_state' ), 10, 2 );
		\add_action( 'pre_get_posts', array( self::class, 'filter_list' ) );

		foreach ( self::post_types() as $post_type ) {
			\add_filter( "views_edit-{$post_type}", array( self::class, 'add_view' ) );
		}
	}

	/**
	 * Post types that have a starter library.
	 *
	 * @return array<int,string>
	 */
	private static function post_types(): array {
		$types = array();
		foreach ( Sgs_Starter_Library_Seeder::LIBRARY_AREAS as $area ) {
			$type = Sgs_Active_Layout::post_type( $area );
			if ( '' !== $type ) {
				$types[] = $type;
			}
		}
		return $types;
	}

	/**
	 * Flag a seeded post in the list table.
	 *
	 * @param array<string,string> $states Existing post states.
	 * @param \WP_Post             $post   Row being rendered.
	 * @return array<string,string>
	 */
	public static function add_post_state( array $states, $post ): array {
		if ( ! $post instanceof \WP_Post || ! \in_array( $post->post_type, self::post_types(), true ) ) {
			return $states;
		}

		if ( '' !== (string) \get_post_meta( $post->ID, Sgs_Starter_Library_Seeder::MARKER_META, true ) ) {
			$states['sgs_framework_look'] = \esc_html__( 'Framework look', 'sgs-blocks' );
		}

		return $states;
	}

	/**
	 * Add the "Framework looks (N)" view link.
	 *
	 * @param array<string,string> $views Existing view links.
	 * @return array<string,string>
	 */
	public static function add_view( array $views ): array {
		$post_type = self::current_list_post_type();
		if ( '' === $post_type ) {
			return $views;
		}

		$filtering = self::is_filtering();
		$count     = self::count_looks( $post_type );
		if ( 0 === $count && ! $filtering ) {
			return $views;
		}

		if ( $filtering ) {
			// The "All" view would otherwise still read as the current one.
			foreach ( $views as $key => $view ) {
				$views[ $key ] = \str_replace( array( ' class="current"', ' aria-current="page"' ), '', $view );
			}
		}

		$url = \add_query_arg(
			array(
				'post_type'     => $post_type,
				self::QUERY_VAR => 1,
			),
			\admin_url( 'edit.php' )
		);

		$views[ self::VIEW_KEY ] = \sprintf(
			'<a href="%1$s"%2$s>%3$s <span class="count">(%4$d)</span></a>',
			\esc_url( $url ),
			$filtering ? ' class="current" aria-current="page"' : '',
			\esc_html__( 'Framework looks', 'sgs-blocks' ),
			$count
		);

		return $views;
	}

	/**
	 * Restrict the admin list to seeded looks when the view is active.
	 *
	 * @param \WP_Query $query Query being prepared.
	 */
	public static function filter_list( $query ): void {
		if ( ! $query instanceof \WP_Query || ! \is_admin() || ! $query->is_main_query() || ! self::is_filtering() ) {
			return;
		}

		if ( ! \in_array( $query->get( 'post_type' ), self::post_types(), true ) ) {
			return;
		}

		$meta_query   = (array) $query->get( 'meta_query' );
		$meta_query[] = array(
			'key'     => Sgs_Starter_Library_Seeder::MARKER_META,
			'compare' => 'EXISTS',
		);
		$query->set( 'meta_query', $meta_query );
	}

	/**
	 * Whether the request asks for the framework-looks view.
	 */
	private static function is_filtering(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only list filter, no state change.
		return isset( $_GET[ self::QUERY_VAR ] ) && '1' === \sanitize_text_field( \wp_unslash( $_GET[ self::QUERY_VAR ] ) );
	}

	/**
	 * Post type of the list table being rendered, if it has a library.
	 */
	private static function current_list_post_type(): string {
		$screen    = \function_exists( 'get_current_screen' ) ? \get_current_screen() : null;
		$post_type = ( $screen instanceof \WP_Screen ) ? (string) $screen->post_type : '';

		return \in_array( $post_type, self::post_types(), true ) ? $post_type : '';
	}

	/**
	 * Count seeded looks of a post type, excluding trash and auto-drafts.
	 *
	 * @param string $post_type CPT slug.
	 */
	private static function count_looks( string $post_type ): int {
		global $wpdb;

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- one COUNT per list-table render; a cache would go stale the moment a look is trashed.
		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT( DISTINCT p.ID ) FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id = p.ID WHERE p.post_type = %s AND p.post_status NOT IN ( 'trash', 'auto-draft' ) AND m.meta_key = %s",
				$post_type,
				Sgs_Starter_Library_Seeder::MARKER_META
			)
		);
		// phpcs:enable

		return (int) $count;
	}
}
