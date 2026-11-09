<?php
/**
 * The measured fold count of a page (Spec 38A §9).
 *
 * The block editor measures the saved page's real first screen at three viewport sizes and stores how many top-level
 * content sections sit above the fold as post meta. `section_count()` returns that number, or the default
 * `Sgs_Motion_Fold::FOLD_SECTIONS` for a page that was never measured.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-motion-fold.php';

/**
 * Storage and read access for the measured section count.
 */
final class Sgs_Fold_Scan {

	/** Post meta key holding the measured section count. */
	public const META_KEY = '_sgs_fold_sections';

	/** Smallest stored count. */
	public const MIN_SECTIONS = 1;

	/** Largest stored count. */
	public const MAX_SECTIONS = 20;

	/**
	 * Wire the meta registration.
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_meta' ) );
	}

	/**
	 * Register the meta: private, an absolute integer, not exposed in REST.
	 */
	public static function register_meta(): void {
		\register_post_meta(
			'',
			self::META_KEY,
			array(
				'type'              => 'integer',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => 'absint',
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ): bool {
					return \current_user_can( 'edit_post', (int) $post_id );
				},
			)
		);
	}

	/**
	 * How many top-level content sections count as above the fold on a post.
	 *
	 * @param int $post_id Post ID.
	 * @return int The measured count, or `Sgs_Motion_Fold::FOLD_SECTIONS` when none is stored or the stored value is out of range.
	 */
	public static function section_count( int $post_id ): int {
		$stored = (int) \get_post_meta( $post_id, self::META_KEY, true );
		if ( $stored >= self::MIN_SECTIONS && $stored <= self::MAX_SECTIONS ) {
			return $stored;
		}
		return Sgs_Motion_Fold::FOLD_SECTIONS;
	}
}
