<?php
/**
 * Backup and restore of post content for the motion migration sweep (Spec 38A FR-38A-32).
 *
 * The backup is one JSON file holding the original `post_content` of every post a sweep will write. It is written to
 * a directory outside `ABSPATH` (and outside `DOCUMENT_ROOT` when one is set) under a random file name, with owner-only
 * permissions, so it cannot be fetched over HTTP. Restore writes the stored content back with `$wpdb->update`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Migrate_Backup
 */
final class Sgs_Motion_Migrate_Backup {

	const DIR_NAME = 'sgs-motion-backups';

	/**
	 * Candidate parent directories, best first: the folder above WordPress, then the system temp directory.
	 *
	 * @return string[]
	 */
	public static function default_candidates(): array {
		return array( dirname( rtrim( ABSPATH, '/\\' ) ), sys_get_temp_dir() );
	}

	/**
	 * Resolve the directory a backup is written to.
	 *
	 * A candidate qualifies when it exists, is writable and its real path is outside `$abspath` (and outside
	 * `$docroot` when given). The `sgs-motion-backups` sub-directory is created with mode 0700.
	 *
	 * @param string      $abspath    The WordPress root.
	 * @param string[]    $candidates Parent directories to try, in order.
	 * @param string|null $docroot    The web server document root, when known.
	 * @return string|null The backup directory, or null when no candidate qualifies.
	 */
	public static function resolve_directory( string $abspath, array $candidates, ?string $docroot = null ): ?string {
		foreach ( $candidates as $candidate ) {
			$real = realpath( (string) $candidate );
			if ( false === $real || ! is_dir( $real ) || ! is_writable( $real ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_is_writable -- a backup location probe.
				continue;
			}
			if ( self::is_inside( $real, $abspath ) || ( null !== $docroot && '' !== $docroot && self::is_inside( $real, $docroot ) ) ) {
				continue;
			}
			$dir = $real . DIRECTORY_SEPARATOR . self::DIR_NAME;
			if ( ! is_dir( $dir ) && ! mkdir( $dir, 0700, true ) && ! is_dir( $dir ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_mkdir -- outside the web root on purpose.
				continue;
			}
			return $dir;
		}
		return null;
	}

	/**
	 * Whether `$path` is `$root` or lies below it.
	 *
	 * @param string $path Real path.
	 * @param string $root A directory (need not exist).
	 * @return bool
	 */
	public static function is_inside( string $path, string $root ): bool {
		$root_real = realpath( $root );
		$root_norm = rtrim( str_replace( '\\', '/', false === $root_real ? $root : $root_real ), '/' ) . '/';
		$path_norm = rtrim( str_replace( '\\', '/', $path ), '/' ) . '/';
		if ( DIRECTORY_SEPARATOR === '\\' ) {
			$root_norm = strtolower( $root_norm );
			$path_norm = strtolower( $path_norm );
		}
		return 0 === strpos( $path_norm, $root_norm );
	}

	/**
	 * Write a backup of the given posts.
	 *
	 * @param array<int,array{ID:int,post_type:string,post_content:string}> $posts Posts about to be changed.
	 * @param string                                                        $dir   Directory from `resolve_directory()`.
	 * @param string                                                        $site  Site URL, recorded for the operator.
	 * @return string|null The backup file path, or null when writing or the read-back check failed.
	 */
	public static function write( array $posts, string $dir, string $site = '' ): ?string {
		$file = $dir . DIRECTORY_SEPARATOR . 'motion-migrate-' . gmdate( 'Ymd-His' ) . '-' . bin2hex( random_bytes( 8 ) ) . '.json';
		$json = wp_json_encode(
			array(
				'created' => gmdate( 'c' ),
				'site'    => $site,
				'posts'   => array_values( $posts ),
			),
			JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
		);
		if ( ! is_string( $json ) || false === file_put_contents( $file, $json, LOCK_EX ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- outside the web root on purpose.
			return null;
		}
		chmod( $file, 0600 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_chmod -- owner-only backup.
		$back = self::read( $file );
		if ( null === $back || count( $back ) !== count( $posts ) ) {
			return null;
		}
		foreach ( array_values( $posts ) as $i => $post ) {
			if ( $back[ $i ]['post_content'] !== $post['post_content'] ) {
				return null;
			}
		}
		return $file;
	}

	/**
	 * Read a backup file.
	 *
	 * @param string $file Backup path.
	 * @return array<int,array{ID:int,post_type:string,post_content:string}>|null Null when unreadable or malformed.
	 */
	public static function read( string $file ): ?array {
		$raw  = is_readable( $file ) ? file_get_contents( $file ) : false; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local backup file.
		$data = false === $raw ? null : json_decode( $raw, true );
		if ( ! is_array( $data ) || ! isset( $data['posts'] ) || ! is_array( $data['posts'] ) ) {
			return null;
		}
		$posts = array();
		foreach ( $data['posts'] as $post ) {
			if ( ! is_array( $post ) || ! isset( $post['ID'], $post['post_type'] ) || ! is_string( $post['post_content'] ?? null ) ) {
				return null;
			}
			$posts[] = array(
				'ID'           => (int) $post['ID'],
				'post_type'    => (string) $post['post_type'],
				'post_content' => $post['post_content'],
			);
		}
		return $posts;
	}

	/**
	 * Write the backed-up content back with `$wpdb->update` and clear each post's cache.
	 *
	 * @param string $file Backup path.
	 * @return array{restored:int,failed:int[]}|null Null when the file cannot be read.
	 */
	public static function restore( string $file ): ?array {
		global $wpdb;
		$posts = self::read( $file );
		if ( null === $posts ) {
			return null;
		}
		$restored = 0;
		$failed   = array();
		foreach ( $posts as $post ) {
			$done = $wpdb->update( $wpdb->posts, array( 'post_content' => $post['post_content'] ), array( 'ID' => $post['ID'] ), array( '%s' ), array( '%d' ) );
			if ( false === $done ) {
				$failed[] = $post['ID'];
				continue;
			}
			clean_post_cache( $post['ID'] );
			++$restored;
		}
		return array(
			'restored' => $restored,
			'failed'   => $failed,
		);
	}
}
