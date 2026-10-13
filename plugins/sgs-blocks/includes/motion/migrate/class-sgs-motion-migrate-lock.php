<?php
/**
 * The editor-lock guard for the motion migration sweep: a post another user has open in the block editor is never
 * written, because the editor's save would overwrite the write with its older in-memory state (and the sweep's write
 * would be lost or, worse, clobber the editor's).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Migrate_Lock
 */
final class Sgs_Motion_Migrate_Lock {

	/**
	 * Load `wp_check_post_lock()` (it lives in wp-admin, which a CLI run does not load) and say whether it exists.
	 *
	 * @return bool
	 */
	public static function available(): bool {
		if ( ! function_exists( 'wp_check_post_lock' ) && is_readable( ABSPATH . 'wp-admin/includes/post.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/post.php';
		}
		return function_exists( 'wp_check_post_lock' );
	}

	/**
	 * The user editing a post, or 0 when nobody is.
	 *
	 * @param int $post_id Post ID.
	 * @return int User ID, or 0.
	 */
	public static function owner( int $post_id ): int {
		return (int) wp_check_post_lock( $post_id );
	}

	/**
	 * Split rows into those free to write and those locked.
	 *
	 * @param array<int,array<string,mixed>> $rows Rows with an `ID`.
	 * @return array{free:array<int,array<string,mixed>>,locked:array<int,int>} `locked` maps post ID to the editing user.
	 */
	public static function partition( array $rows ): array {
		$free   = array();
		$locked = array();
		foreach ( $rows as $row ) {
			$user = self::owner( (int) $row['ID'] );
			if ( $user > 0 ) {
				$locked[ (int) $row['ID'] ] = $user;
			} else {
				$free[] = $row;
			}
		}
		return array(
			'free'   => $free,
			'locked' => $locked,
		);
	}
}
