<?php
/**
 * Seed the framework "library" of starter looks for a layout area (FR-37-48,
 * Spec 37).
 *
 * The default-per-area seed ({@see Sgs_Header_Footer_Starter_Seeder}) gives a
 * fresh install one Active post. A library area goes further: every registered
 * block pattern scoped to the area's CPT (`Post Types: sgs_drawer`) is also
 * inserted as a PUBLISHED, NON-Active post, so the picker on the burger lists
 * the framework looks the moment the plugin is active. An unreferenced
 * published post renders nowhere, so seeding a look never changes the live site.
 *
 * Idempotency is by private post meta {@see self::MARKER_META}: a pattern is
 * skipped when ANY post of the CPT (trash included) already carries its slug.
 * Reactivation therefore never duplicates a look, never overwrites a client's
 * edited copy, and never resurrects a look the client deleted to the bin.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Seeds the starter-look library for the areas listed in {@see self::LIBRARY_AREAS}.
 */
final class Sgs_Starter_Library_Seeder {

	/**
	 * Private post meta holding the pattern slug a post was seeded from.
	 * Doubles as the idempotency marker and the admin "Framework look" flag.
	 */
	public const MARKER_META = '_sgs_starter_slug';

	/**
	 * Areas that get a library. Add Sgs_Active_Layout::AREA_HEADER or
	 * AREA_FOOTER here to extend the library to that CPT; nothing else changes.
	 *
	 * @var array<int,string>
	 */
	public const LIBRARY_AREAS = array(
		Sgs_Active_Layout::AREA_DRAWER,
	);

	/**
	 * Whether an area has a library.
	 *
	 * @param string $area {@see Sgs_Active_Layout} area token.
	 */
	public static function has_library( string $area ): bool {
		return \in_array( $area, self::LIBRARY_AREAS, true );
	}

	/**
	 * Seed every registered pattern for the area that has no post yet.
	 *
	 * @param string $area {@see Sgs_Active_Layout} area token.
	 * @return array{created:int,skipped:int} `skipped` counts looks already
	 *         present; the blank starter and the default are not counted.
	 */
	public static function seed_library( string $area ): array {
		$result = array(
			'created' => 0,
			'skipped' => 0,
		);

		if ( ! self::has_library( $area ) || ! \class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			return $result;
		}

		$post_type = Sgs_Active_Layout::post_type( $area );
		if ( '' === $post_type || ! \post_type_exists( $post_type ) ) {
			return $result;
		}

		$registry = \WP_Block_Patterns_Registry::get_instance();
		if ( ! $registry ) {
			return $result;
		}

		$skip_slugs = array(
			'sgs/' . $area . '-scratch',
			Sgs_Header_Footer_Starter_Seeder::default_pattern( $area ),
		);

		$plan = self::select_missing(
			$registry->get_all_registered(),
			$post_type,
			$skip_slugs,
			static function ( string $slug ) use ( $post_type ): bool {
				return self::is_seeded( $post_type, $slug );
			}
		);

		$result['skipped'] = $plan['skipped'];
		foreach ( $plan['create'] as $look ) {
			if ( self::insert_starter( $post_type, $look['slug'], $look['title'], $look['content'], 'publish' ) > 0 ) {
				++$result['created'];
			}
		}

		return $result;
	}

	/**
	 * Decide which registered patterns still need a post. Pure: no WordPress
	 * calls, so it is unit-tested without a WordPress install.
	 *
	 * @param array<int,array<string,mixed>> $patterns    Registered patterns (`name`, `title`, `content`, `postTypes`).
	 * @param string                         $post_type   CPT being seeded.
	 * @param array<int,string>              $skip_slugs  Slugs never seeded as a look.
	 * @param callable                       $is_seeded   `fn( string $slug ): bool` — a post already carries the marker.
	 * @return array{create:array<int,array{slug:string,title:string,content:string}>,skipped:int}
	 */
	public static function select_missing( array $patterns, string $post_type, array $skip_slugs, callable $is_seeded ): array {
		$plan = array(
			'create'  => array(),
			'skipped' => 0,
		);

		foreach ( $patterns as $pattern ) {
			$slug    = isset( $pattern['name'] ) && \is_string( $pattern['name'] ) ? $pattern['name'] : '';
			$types   = isset( $pattern['postTypes'] ) && \is_array( $pattern['postTypes'] ) ? $pattern['postTypes'] : array();
			$content = isset( $pattern['content'] ) && \is_string( $pattern['content'] ) ? $pattern['content'] : '';

			if ( '' === $slug || '' === $content || ! \in_array( $post_type, $types, true ) || \in_array( $slug, $skip_slugs, true ) ) {
				continue;
			}

			if ( $is_seeded( $slug ) ) {
				++$plan['skipped'];
				continue;
			}

			$plan['create'][] = array(
				'slug'    => $slug,
				'title'   => isset( $pattern['title'] ) && \is_string( $pattern['title'] ) && '' !== $pattern['title'] ? $pattern['title'] : $slug,
				'content' => $content,
			);
		}

		return $plan;
	}

	/**
	 * Whether any post of the CPT, in any status including trash, already
	 * carries the marker for this slug.
	 *
	 * @param string $post_type CPT slug.
	 * @param string $slug      Pattern slug.
	 */
	public static function is_seeded( string $post_type, string $slug ): bool {
		$found = \get_posts(
			array(
				'post_type'      => $post_type,
				'post_status'    => array( 'any', 'trash' ),
				'meta_key'       => self::MARKER_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- one-row lookup on a low-cardinality CPT.
				'meta_value'     => \sanitize_text_field( $slug ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- one-row lookup on a low-cardinality CPT.
				'fields'         => 'ids',
				'posts_per_page' => 1,
				'no_found_rows'  => true,
			)
		);

		return ! empty( $found );
	}

	/**
	 * Insert one starter post and stamp it with the marker.
	 *
	 * Content is slashed because `wp_insert_post()` unslashes its input, which
	 * would otherwise strip the backslashes from JSON escapes in block comments.
	 *
	 * @param string $post_type CPT slug.
	 * @param string $slug      Pattern slug the post is seeded from.
	 * @param string $title     Post title.
	 * @param string $content   Serialised block markup.
	 * @param string $status    Post status.
	 * @return int New post ID, or 0 on failure.
	 */
	public static function insert_starter( string $post_type, string $slug, string $title, string $content, string $status ): int {
		$post_id = \wp_insert_post(
			array(
				'post_type'    => $post_type,
				'post_status'  => $status,
				'post_title'   => \sanitize_text_field( $title ),
				'post_content' => \wp_slash( $content ),
				'meta_input'   => array(
					self::MARKER_META => \sanitize_text_field( $slug ),
				),
			),
			true
		);

		return ( \is_wp_error( $post_id ) || ! $post_id ) ? 0 : (int) $post_id;
	}
}
