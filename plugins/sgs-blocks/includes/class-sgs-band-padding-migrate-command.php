<?php
/**
 * `wp sgs band-padding-migrate`: folds a stored `contentBandPadding` into `padding` across every post.
 *
 * Default is a dry run that prints the diff and writes nothing. `--apply` skips posts open in the editor, backs up
 * every post it will change to a file outside the web root, then writes with `$wpdb->update` and `clean_post_cache`
 * (never `wp_update_post`: its save hooks run the WooCommerce product preflight and create revisions). After each
 * write it re-reads the row and compares content and status; after each post type it compares the published counts
 * with the counts taken before the run. Any mismatch aborts. `--rollback=<file>` writes a backup back.
 *
 * Registered in `sgs-blocks.php` inside the WP-CLI block:
 *
 *   \WP_CLI::add_command( 'sgs band-padding-migrate', Sgs_Band_Padding_Migrate_Command::class );
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

use SGS\Blocks\Motion\Sgs_Motion_Migrate_Backup;
use SGS\Blocks\Motion\Sgs_Motion_Migrate_Lock;
use SGS\Blocks\Motion\Sgs_Motion_Migrate_Runner;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-band-padding-folder.php';
require_once __DIR__ . '/motion/migrate/interface-sgs-motion-mapper.php';
require_once __DIR__ . '/motion/migrate/class-sgs-motion-migrate-runner.php';
require_once __DIR__ . '/motion/migrate/class-sgs-motion-migrate-backup.php';
require_once __DIR__ . '/motion/migrate/class-sgs-motion-migrate-lock.php';

/**
 * Fold `contentBandPadding` into `padding` in stored block content.
 *
 * ## OPTIONS
 *
 * [--dry-run]
 * : Print the diff and write nothing. This is the default.
 *
 * [--apply]
 * : Back up, then write the migrated content.
 *
 * [--rollback=<file>]
 * : Restore the posts in a backup file written by --apply.
 *
 * [--post=<id>]
 * : Only this post.
 *
 * [--post_type=<list>]
 * : Comma-separated post types. Default: every registered type except those that cannot hold blocks.
 *
 * ## EXAMPLES
 *
 *     wp sgs band-padding-migrate
 *     wp sgs band-padding-migrate --post_type=wp_template_part,page
 *     wp sgs band-padding-migrate --apply
 *     wp sgs band-padding-migrate --rollback=/path/outside/web/root/motion-migrate-20261022-ab12.json
 */
final class Sgs_Band_Padding_Migrate_Command {

	const BATCH = 200;

	/**
	 * Entry point.
	 *
	 * @param string[]             $args       Positional arguments (unused).
	 * @param array<string,string> $assoc_args Named arguments.
	 */
	public function __invoke( array $args, array $assoc_args ): void {
		unset( $args );
		if ( isset( $assoc_args['rollback'] ) ) {
			if ( isset( $assoc_args['dry-run'] ) || isset( $assoc_args['apply'] ) ) {
				\WP_CLI::error( '--rollback cannot be combined with --dry-run or --apply.' );
			}
			$this->rollback( (string) $assoc_args['rollback'] );
			return;
		}
		if ( isset( $assoc_args['apply'] ) && isset( $assoc_args['dry-run'] ) ) {
			\WP_CLI::error( '--apply and --dry-run cannot be used together.' );
		}
		$types   = $this->resolve_types( isset( $assoc_args['post_type'] ) ? (string) $assoc_args['post_type'] : '' );
		$post_id = isset( $assoc_args['post'] ) ? absint( $assoc_args['post'] ) : 0;
		$rows    = $this->collect( new Sgs_Band_Padding_Folder(), $types, $post_id );
		$this->print_diff( $rows );
		if ( ! isset( $assoc_args['apply'] ) ) {
			\WP_CLI::success( 'Dry run: nothing was written. Re-run with --apply to write.' );
			return;
		}
		$this->apply( $rows );
	}

	/**
	 * The post types to sweep.
	 *
	 * @param string $requested Comma-separated list, or empty for all.
	 * @return string[]
	 */
	private function resolve_types( string $requested ): array {
		$covered = Sgs_Motion_Migrate_Runner::post_types( array_values( get_post_types() ) );
		if ( '' === $requested ) {
			return $covered;
		}
		$types = array_values( array_filter( array_map( 'sanitize_key', explode( ',', $requested ) ) ) );
		$bad   = array_diff( $types, $covered );
		if ( array() !== $bad || array() === $types ) {
			\WP_CLI::error( 'Unknown or non-block post type(s): ' . implode( ', ', $bad ) . '. Covered: ' . implode( ', ', $covered ) );
		}
		return $types;
	}

	/**
	 * Fold every matching post.
	 *
	 * @param Sgs_Band_Padding_Folder $folder  Folder.
	 * @param string[]                $types   Post types.
	 * @param int                     $post_id One post, or 0 for all.
	 * @return array<int,array<string,mixed>> One row per post that has a change.
	 */
	private function collect( Sgs_Band_Padding_Folder $folder, array $types, int $post_id ): array {
		global $wpdb;
		$rows    = array();
		$last_id = 0;
		$fetched = 0;
		$marks   = implode( ',', array_fill( 0, count( $types ), '%s' ) );
		$one     = $post_id > 0 ? ' AND ID = %d' : '';
		do {
			$params = array_merge( $types, array( $last_id ), $post_id > 0 ? array( $post_id ) : array(), array( self::BATCH ) );
			$posts  = $wpdb->get_results( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- placeholders are generated; a one-off sweep.
				$wpdb->prepare( "SELECT ID, post_type, post_status, post_title, post_modified_gmt, post_content FROM {$wpdb->posts} WHERE post_type IN ({$marks}) AND post_status NOT IN ('auto-draft','trash') AND ID > %d{$one} ORDER BY ID ASC LIMIT %d", $params ), // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
				ARRAY_A
			);
			foreach ( is_array( $posts ) ? $posts : array() as $post ) {
				$last_id = (int) $post['ID'];
				$result  = $folder->migrate_content( (string) $post['post_content'] );
				if ( ! $result['changed'] ) {
					continue;
				}
				$rows[] = array(
					'ID'                => $last_id,
					'post_type'         => (string) $post['post_type'],
					'post_status'       => (string) $post['post_status'],
					'post_title'        => (string) $post['post_title'],
					'post_modified_gmt' => (string) $post['post_modified_gmt'],
					'post_content'      => (string) $post['post_content'],
					'result'            => $result,
				);
			}
			$fetched = is_array( $posts ) ? count( $posts ) : 0;
		} while ( self::BATCH === $fetched );
		return $rows;
	}

	/**
	 * Print the per-post diff and a summary.
	 *
	 * @param array<int,array<string,mixed>> $rows Rows from `collect()`.
	 */
	private function print_diff( array $rows ): void {
		$blocks    = 0;
		$conflicts = 0;
		foreach ( $rows as $row ) {
			\WP_CLI::log( sprintf( 'Post %d (%s) "%s"', $row['ID'], $row['post_type'], $row['post_title'] ) );
			foreach ( $row['result']['changes'] as $change ) {
				++$blocks;
				\WP_CLI::log( sprintf( '  block %s %s: contentBandPadding folded into padding', $change['path'], $change['block'] ) );
				foreach ( $change['conflicts'] as $clash ) {
					++$conflicts;
					\WP_CLI::warning( sprintf( '  CONFLICT block %s %s: %s %s was %s on padding, band value %s wins', $change['path'], $change['block'], $clash['tier'], $clash['side'], $clash['own'], $clash['band'] ) );
				}
			}
		}
		\WP_CLI::log( sprintf( '%d post(s) with changes, %d block(s) folded, %d conflict(s).', count( $rows ), $blocks, $conflicts ) );
	}

	/**
	 * Back up, then write.
	 *
	 * @param array<int,array<string,mixed>> $rows Rows from `collect()`.
	 */
	private function apply( array $rows ): void {
		if ( ! Sgs_Motion_Migrate_Lock::available() ) {
			\WP_CLI::error( 'wp_check_post_lock() is not available, so editor locks cannot be checked. Nothing was written.' );
		}
		$locked = 0;
		$split  = Sgs_Motion_Migrate_Lock::partition( $rows );
		foreach ( $split['locked'] as $id => $user ) {
			++$locked;
			\WP_CLI::warning( sprintf( 'Skipped post %d: user %d has it open in the editor.', $id, $user ) );
		}
		$todo = $split['free'];
		if ( array() === $todo ) {
			$this->finish( 0, $locked, '' );
			return;
		}
		$dir = Sgs_Motion_Migrate_Backup::resolve_directory( ABSPATH, Sgs_Motion_Migrate_Backup::default_candidates(), isset( $_SERVER['DOCUMENT_ROOT'] ) ? (string) $_SERVER['DOCUMENT_ROOT'] : null ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- CLI, compared as a path only.
		if ( null === $dir ) {
			\WP_CLI::error( 'No writable backup directory outside the web root. Nothing was written.' );
		}
		$backup = Sgs_Motion_Migrate_Backup::write(
			array_map(
				static function ( array $row ): array {
					return array(
						'ID'           => $row['ID'],
						'post_type'    => $row['post_type'],
						'post_content' => $row['post_content'],
					);
				},
				$todo
			),
			$dir,
			home_url()
		);
		if ( null === $backup ) {
			\WP_CLI::error( 'The backup could not be written and verified. Nothing was written.' );
		}
		\WP_CLI::log( 'Backup: ' . $backup );
		$before  = $this->published_counts();
		$written = 0;
		foreach ( $todo as $row ) {
			$user = Sgs_Motion_Migrate_Lock::owner( $row['ID'] );
			if ( $user > 0 ) {
				++$locked;
				\WP_CLI::warning( sprintf( 'Skipped post %d: user %d opened it in the editor during the run.', $row['ID'], $user ) );
				continue;
			}
			$this->write_post( $row, $backup );
			++$written;
		}
		$after = $this->published_counts();
		if ( $after !== $before ) {
			\WP_CLI::error( sprintf( 'Published counts changed (before %s, after %s). Stopped. Roll back with: wp sgs band-padding-migrate --rollback=%s', wp_json_encode( $before ), wp_json_encode( $after ), $backup ) );
		}
		$this->finish( $written, $locked, $backup );
	}

	/**
	 * Write one post, then re-read it and check the write.
	 *
	 * @param array<string,mixed> $row    Post row.
	 * @param string              $backup Backup path, for the rollback hint.
	 */
	private function write_post( array $row, string $backup ): void {
		global $wpdb;
		$hint = sprintf( 'Roll back with: wp sgs band-padding-migrate --rollback=%s', $backup );
		$done = $wpdb->update( $wpdb->posts, array( 'post_content' => $row['result']['content'] ), array( 'ID' => $row['ID'] ), array( '%s' ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- no save hooks on purpose.
		if ( false === $done ) {
			\WP_CLI::error( sprintf( 'Writing post %d failed. %s', $row['ID'], $hint ) );
		}
		clean_post_cache( $row['ID'] );
		$back = $wpdb->get_row( $wpdb->prepare( "SELECT post_content, post_status FROM {$wpdb->posts} WHERE ID = %d", $row['ID'] ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- the write must be read back uncached.
		if ( ! is_array( $back ) || $back['post_content'] !== $row['result']['content'] || $back['post_status'] !== $row['post_status'] ) {
			\WP_CLI::error( sprintf( 'Post %d does not read back as written (content or status differs). Stopped. %s', $row['ID'], $hint ) );
		}
		if ( has_action( 'litespeed_purge_post' ) ) {
			do_action( 'litespeed_purge_post', $row['ID'] ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals -- LiteSpeed Cache's own action.
		}
	}

	/**
	 * Report the run; exit non-zero when posts were skipped as locked.
	 *
	 * @param int    $written Posts written.
	 * @param int    $locked  Posts skipped as locked.
	 * @param string $backup  Backup path, or empty.
	 */
	private function finish( int $written, int $locked, string $backup ): void {
		$summary = sprintf( 'Wrote %d post(s); published counts unchanged.%s', $written, '' === $backup ? '' : ' Roll back with: wp sgs band-padding-migrate --rollback=' . $backup );
		if ( $locked > 0 ) {
			\WP_CLI::log( $summary );
			\WP_CLI::error( sprintf( '%d post(s) skipped (locked), re-run when they are closed.', $locked ) );
		}
		\WP_CLI::success( 0 === $written ? 'Nothing to write.' : $summary );
	}

	/**
	 * Published post counts per post type.
	 *
	 * @return array<string,int>
	 */
	private function published_counts(): array {
		global $wpdb;
		$rows   = $wpdb->get_results( $wpdb->prepare( "SELECT post_type, COUNT(*) AS total FROM {$wpdb->posts} WHERE post_status = %s GROUP BY post_type", 'publish' ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- a count must not be cached.
		$counts = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$counts[ (string) $row['post_type'] ] = (int) $row['total'];
		}
		ksort( $counts );
		return $counts;
	}

	/**
	 * Restore a backup file.
	 *
	 * @param string $file Backup path.
	 */
	private function rollback( string $file ): void {
		$result = Sgs_Motion_Migrate_Backup::restore( $file );
		if ( null === $result ) {
			\WP_CLI::error( 'Cannot read a backup at ' . $file );
		}
		if ( array() !== $result['failed'] ) {
			\WP_CLI::error( sprintf( 'Restored %d post(s); failed on: %s', $result['restored'], implode( ', ', $result['failed'] ) ) );
		}
		\WP_CLI::success( sprintf( 'Restored %d post(s).', $result['restored'] ) );
	}
}
