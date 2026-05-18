<?php
/**
 * SGS Template Part Seeder — FR-S2-1.
 *
 * Hooks save_post_wp_global_styles and, when a new style variation is activated,
 * seeds the header + footer wp_template_part records from the pattern slugs in
 * settings.custom.sgs.{headerPattern,footerPattern} (FR-S2-2).
 *
 * Mitigations: M3 (slug compare + 5s transient lock); A3 (idempotent); C1
 * (edit_theme_options gate); FR-S7-3 (Sgs_Safety_Guard::seeding_armed());
 * FR-S7-4 (mark_seeded() writes the 3 tracking meta keys).
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Template_Part_Seeder.
 */
final class Sgs_Template_Part_Seeder {

	const TRANSIENT_LOCK         = 'sgs_seeding_in_progress';
	const LOCK_TTL               = 5;
	const DEFAULT_HEADER_PATTERN = 'sgs/framework-header-default';
	const DEFAULT_FOOTER_PATTERN = 'sgs/framework-footer-default';
	const POST_TYPE              = 'wp_template_part';

	/**
	 * Wire the hook. Idempotent.
	 */
	public static function register(): void {
		\add_action( 'save_post_wp_global_styles', array( self::class, 'maybe_seed' ), 20, 3 );
	}

	/**
	 * Save_post_wp_global_styles handler.
	 *
	 * Steps inside maybe_seed():
	 *   1. Safety-guard check (FR-S7-3).
	 *   2. Capability gate edit_theme_options (C1).
	 *   3. Transient-lock acquire; bail if already held (M3).
	 *   4. Resolve active variation slug (Layer A resolver, Layer B JSON decode).
	 *   5. Resolve header + footer pattern slugs from variation manifest.
	 *   6. Per-area seeding: compare meta vs new slug, write only on mismatch.
	 *   7. Release the lock (finally block — guaranteed).
	 *
	 * All writes wrapped try/catch; failures error_log and never propagate.
	 *
	 * @param int      $post_id WP_Global_Styles post ID.
	 * @param \WP_Post $post    Post object (unused).
	 * @param bool     $update  Whether this is an update (unused).
	 */
	public static function maybe_seed( int $post_id, $post = null, bool $update = false ): void {
		unset( $post, $update );

		if ( ! Sgs_Safety_Guard::seeding_armed() ) {
			return;
		}
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			return;
		}
		if ( false !== \get_transient( self::TRANSIENT_LOCK ) ) {
			return;
		}
		\set_transient( self::TRANSIENT_LOCK, 1, self::LOCK_TTL );

		try {
			$variation_slug = self::get_active_variation_slug( $post_id );
			if ( '' === $variation_slug ) {
				return;
			}
			$patterns = self::resolve_pattern_slugs( $variation_slug );
			self::seed_area( 'header', $patterns['header'], $variation_slug );
			self::seed_area( 'footer', $patterns['footer'], $variation_slug );
		} catch ( \Throwable $e ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log( 'SGS Template Part Seeder: ' . $e->getMessage() );
		} finally {
			\delete_transient( self::TRANSIENT_LOCK );
		}
	}

	/**
	 * Resolve the active style variation slug.
	 *
	 * Layer A: WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles (WP 6.5+).
	 * Layer B: direct json_decode of the post_content (fallback for API changes).
	 *
	 * @param int $post_id wp_global_styles post ID.
	 * @return string Sanitized slug or '' when unresolved.
	 */
	public static function get_active_variation_slug( int $post_id ): string {
		if ( \class_exists( '\\WP_Theme_JSON_Resolver' ) && \method_exists( '\\WP_Theme_JSON_Resolver', 'get_user_data_from_wp_global_styles' ) ) {
			try {
				$theme = \wp_get_theme();
				$data  = \WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( $theme );
				if ( \is_array( $data ) ) {
					$slug = $data['title'] ?? ( $data['settings']['custom']['sgs']['variation'] ?? '' );
					if ( \is_string( $slug ) && '' !== $slug ) {
						return \sanitize_key( $slug );
					}
				}
			} catch ( \Throwable $e ) {
				unset( $e );
			}
		}

		$post = \get_post( $post_id );
		if ( ! $post || empty( $post->post_content ) ) {
			return '';
		}
		$decoded = \json_decode( (string) $post->post_content, true );
		if ( ! \is_array( $decoded ) ) {
			return '';
		}
		$slug = $decoded['title'] ?? ( $decoded['settings']['custom']['sgs']['variation'] ?? '' );
		return \is_string( $slug ) ? \sanitize_key( $slug ) : '';
	}

	/**
	 * Resolve header + footer pattern slugs from the variation manifest.
	 *
	 * Falls back to framework defaults + structured error_log on missing keys.
	 *
	 * @param string $variation_slug Style variation slug.
	 * @return array{header:string,footer:string}
	 */
	public static function resolve_pattern_slugs( string $variation_slug ): array {
		$manifest = self::load_variation_manifest( $variation_slug );
		$sgs      = $manifest['settings']['custom']['sgs'] ?? array();

		$header = ( isset( $sgs['headerPattern'] ) && \is_string( $sgs['headerPattern'] ) ) ? $sgs['headerPattern'] : '';
		$footer = ( isset( $sgs['footerPattern'] ) && \is_string( $sgs['footerPattern'] ) ) ? $sgs['footerPattern'] : '';

		if ( '' === $header ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log( "SGS Template Part Seeder: variation '{$variation_slug}' has no headerPattern — falling back to " . self::DEFAULT_HEADER_PATTERN );
			$header = self::DEFAULT_HEADER_PATTERN;
		}
		if ( '' === $footer ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log( "SGS Template Part Seeder: variation '{$variation_slug}' has no footerPattern — falling back to " . self::DEFAULT_FOOTER_PATTERN );
			$footer = self::DEFAULT_FOOTER_PATTERN;
		}

		return array(
			'header' => $header,
			'footer' => $footer,
		);
	}

	/**
	 * Read a variation manifest from theme/sgs-theme/styles/.
	 *
	 * @param string $variation_slug Style variation slug.
	 * @return array<string,mixed>
	 */
	private static function load_variation_manifest( string $variation_slug ): array {
		if ( '' === $variation_slug ) {
			return array();
		}
		$styles_dir = \defined( 'SGS_BLOCKS_PATH' )
			? \dirname( \SGS_BLOCKS_PATH, 2 ) . '/theme/sgs-theme/styles'
			: '';
		if ( isset( $GLOBALS['sgs_test_styles_dir'] ) && \is_string( $GLOBALS['sgs_test_styles_dir'] ) ) {
			$styles_dir = $GLOBALS['sgs_test_styles_dir'];
		}
		$path = $styles_dir . '/' . \sanitize_file_name( $variation_slug . '.json' );
		if ( ! \is_readable( $path ) ) {
			return array();
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$raw = \file_get_contents( $path );
		if ( false === $raw ) {
			return array();
		}
		$decoded = \json_decode( $raw, true );
		return \is_array( $decoded ) ? $decoded : array();
	}

	/**
	 * Seed one template-part area (header or footer).
	 *
	 * @param string $area           'header' or 'footer'.
	 * @param string $pattern_slug   Pattern slug to seed from.
	 * @param string $variation_slug Active variation slug.
	 */
	private static function seed_area( string $area, string $pattern_slug, string $variation_slug ): void {
		$existing = self::find_template_part( $area );

		if ( $existing > 0 ) {
			$stored = (string) \get_post_meta( $existing, Sgs_Template_Part_Meta::META_VARIATION_SLUG, true );
			if ( $stored === $variation_slug ) {
				return; // M3 slug-compare idempotency.
			}
		}

		$content = self::get_pattern_content( $pattern_slug );
		if ( '' === $content ) {
			$fallback = ( 'header' === $area ) ? self::DEFAULT_HEADER_PATTERN : self::DEFAULT_FOOTER_PATTERN;
			if ( $fallback !== $pattern_slug ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				\error_log( "SGS Template Part Seeder: pattern '{$pattern_slug}' not registered — falling back to {$fallback}" );
				$pattern_slug = $fallback;
				$content      = self::get_pattern_content( $fallback );
			}
			if ( '' === $content ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				\error_log( "SGS Template Part Seeder: fallback pattern '{$pattern_slug}' also not registered — skipping {$area}" );
				return;
			}
		}

		$post_id = self::write_template_part( $area, $existing, $content );
		if ( $post_id > 0 ) {
			Sgs_Template_Part_Meta::mark_seeded( $post_id, $pattern_slug, $variation_slug );
		}
	}

	/**
	 * Return registered block-pattern content, or '' when not registered.
	 *
	 * @param string $pattern_slug Pattern slug.
	 * @return string
	 */
	public static function get_pattern_content( string $pattern_slug ): string {
		if ( ! \class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			return '';
		}
		$registry = \WP_Block_Patterns_Registry::get_instance();
		if ( ! $registry || ! $registry->is_registered( $pattern_slug ) ) {
			return '';
		}
		$pattern = $registry->get_registered( $pattern_slug );
		return ( \is_array( $pattern ) && isset( $pattern['content'] ) && \is_string( $pattern['content'] ) ) ? $pattern['content'] : '';
	}

	/**
	 * Find the wp_template_part post ID for the given area.
	 *
	 * @param string $area 'header' or 'footer'.
	 * @return int Post ID, or 0 when none.
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
	 * Insert or update the wp_template_part record.
	 *
	 * @param string $area     'header' or 'footer'.
	 * @param int    $existing Existing post ID, or 0 to insert.
	 * @param string $content  Pattern markup.
	 * @return int Post ID, or 0 on failure.
	 */
	private static function write_template_part( string $area, int $existing, string $content ): int {
		$args = array(
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
			\error_log( 'SGS Template Part Seeder: wp_insert_post/wp_update_post failed — ' . $result->get_error_message() );
			return 0;
		}
		return (int) $result;
	}
}
