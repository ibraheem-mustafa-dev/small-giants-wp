<?php
/**
 * `wp sgs motion-migrate` (Spec 38A FR-38A-32): the sweep that moves stored old motion attributes onto `sgsMotion`.
 *
 * Default is a dry run that prints the diff and writes nothing. `--apply` skips posts open in the editor, backs up every
 * post it will change to a file outside the web root, then writes with `$wpdb->update` and `clean_post_cache` (never
 * `wp_update_post`: its save hooks run the WooCommerce product preflight, which unpublishes a product that fails it, and
 * create revisions). After each write it re-reads the row and compares content and status; after each post type it
 * compares the published counts with the counts taken before the run. Any mismatch aborts. `--rollback=<file>` writes a
 * backup back.
 *
 * Registered in `sgs-blocks.php` inside the WP-CLI block:
 *
 *   \WP_CLI::add_command( 'sgs motion-migrate', Motion\Sgs_Motion_Migrate_Command::class );
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/interface-sgs-motion-mapper.php';
require_once __DIR__ . '/class-sgs-motion-migrate-runner.php';
require_once __DIR__ . '/class-sgs-motion-migrate-backup.php';
require_once __DIR__ . '/class-sgs-motion-migrate-lock.php';

/**
 * Sweep stored block content onto the motion model.
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
 * [--list-families]
 * : Print the mapper families (the file names in includes/motion/migrate/mappers/ whose class loads).
 *
 * [--post=<id>]
 * : Only this post.
 *
 * [--post_type=<list>]
 * : Comma-separated post types. Default: every registered type except those that cannot hold blocks.
 *
 * [--allow-flagged]
 * : With --apply, also write posts that carry a flag (a conflict between mapped and stored values, or a value the schema dropped or changed). Default: skip them.
 *
 * ## EXAMPLES
 *
 *     wp sgs motion-migrate --list-families
 *     wp sgs motion-migrate --post_type=sgs_header,product
 *     wp sgs motion-migrate --apply
 *     wp sgs motion-migrate --rollback=/path/outside/web/root/motion-migrate-20261013-ab12.json
 */
final class Sgs_Motion_Migrate_Command {

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
		$this->warn_broken_families();
		if ( isset( $assoc_args['list-families'] ) ) {
			$this->list_families();
			return;
		}
		if ( isset( $assoc_args['apply'] ) && isset( $assoc_args['dry-run'] ) ) {
			\WP_CLI::error( '--apply and --dry-run cannot be used together.' );
		}
		$types   = $this->resolve_types( isset( $assoc_args['post_type'] ) ? (string) $assoc_args['post_type'] : '' );
		$post_id = isset( $assoc_args['post'] ) ? absint( $assoc_args['post'] ) : 0;
		$runner  = new Sgs_Motion_Migrate_Runner();
		$rows    = $this->collect( $runner, $types, $post_id );
		$this->print_diff( $rows );
		if ( ! isset( $assoc_args['apply'] ) ) {
			\WP_CLI::success( 'Dry run: nothing was written. Re-run with --apply to write.' );
			return;
		}
		$this->apply( $rows, isset( $assoc_args['allow-flagged'] ) );
	}

	/**
	 * Warn about mapper files whose class is missing or misnamed.
	 */
	private function warn_broken_families(): void {
		foreach ( Sgs_Motion_Migrate_Runner::broken_families() as $family ) {
			\WP_CLI::warning( sprintf( 'Mapper file for "%s" is ignored: it does not declare %s implementing Sgs_Motion_Mapper_Interface.', $family, Sgs_Motion_Migrate_Runner::mapper_class( $family ) ) );
		}
	}

	/**
	 * Print the mapper families whose class loads.
	 */
	private function list_families(): void {
		$families = Sgs_Motion_Migrate_Runner::loadable_families();
		if ( array() === $families ) {
			\WP_CLI::log( 'No mapper families yet in includes/motion/migrate/mappers/.' );
			return;
		}
		foreach ( $families as $family ) {
			\WP_CLI::log( $family );
		}
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
	 * Run the runner over every matching post.
	 *
	 * @param Sgs_Motion_Migrate_Runner $runner  Runner.
	 * @param string[]                  $types   Post types.
	 * @param int                       $post_id One post, or 0 for all.
	 * @return array<int,array<string,mixed>> One row per post that has a change or a flag.
	 */
	private function collect( Sgs_Motion_Migrate_Runner $runner, array $types, int $post_id ): array {
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
				$result  = $runner->migrate_content( (string) $post['post_content'] );
				if ( ! $result['changed'] && array() === $result['flags'] ) {
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
		$blocks = 0;
		$flags  = 0;
		foreach ( $rows as $row ) {
			$result = $row['result'];
			\WP_CLI::log( sprintf( 'Post %d (%s) "%s"', $row['ID'], $row['post_type'], $row['post_title'] ) );
			foreach ( $result['changes'] as $change ) {
				++$blocks;
				\WP_CLI::log( sprintf( '  block %s %s [%s]: removes %s; sgsMotion = %s', $change['path'], $change['block'], implode( ',', $change['families'] ), array() === $change['consumed'] ? '(nothing)' : implode( ',', $change['consumed'] ), wp_json_encode( $change['motion'] ) ) );
			}
			foreach ( $result['flags'] as $flag ) {
				++$flags;
				\WP_CLI::warning( sprintf( '  FLAG block %s %s: %s  %s -> %s', $flag['path'], $flag['block'], $flag['key'], wp_json_encode( $flag['before'] ), wp_json_encode( $flag['after'] ) ) );
			}
		}
		\WP_CLI::log( sprintf( '%d post(s) with changes or flags, %d block(s) migrated, %d flag(s).', count( $rows ), $blocks, $flags ) );
	}

	/**
	 * The rows to write: changed, unflagged (or flagged with --allow-flagged), and not open in the editor.
	 *
	 * @param array<int,array<string,mixed>> $rows          Rows from `collect()`.
	 * @param bool                           $allow_flagged Write flagged posts too.
	 * @param int                            $locked        Count of posts skipped as locked (by reference).
	 * @return array<int,array<string,mixed>>
	 */
	private function select_rows( array $rows, bool $allow_flagged, int &$locked ): array {
		$todo = array();
		foreach ( $rows as $row ) {
			if ( ! $row['result']['changed'] ) {
				continue;
			}
			if ( array() !== $row['result']['flags'] && ! $allow_flagged ) {
				\WP_CLI::warning( sprintf( 'Skipped post %d: it carries flags (see above). Fix the mapper or the stored value, or pass --allow-flagged.', $row['ID'] ) );
				continue;
			}
			$todo[] = $row;
		}
		$split = Sgs_Motion_Migrate_Lock::partition( $todo );
		foreach ( $split['locked'] as $id => $user ) {
			++$locked;
			\WP_CLI::warning( sprintf( 'Skipped post %d: user %d has it open in the editor.', $id, $user ) );
		}
		foreach ( $split['free'] as $row ) {
			$this->warn_newer_autosave( $row );
		}
		return $split['free'];
	}

	/**
	 * Warn when an editor autosave is newer than the post: the editor would offer it over the migrated content.
	 *
	 * @param array<string,mixed> $row Post row.
	 */
	private function warn_newer_autosave( array $row ): void {
		global $wpdb;
		$autosave = $wpdb->get_var( $wpdb->prepare( "SELECT post_modified_gmt FROM {$wpdb->posts} WHERE post_type = 'revision' AND post_parent = %d AND post_name = %s", $row['ID'], $row['ID'] . '-autosave-v1' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- a one-off check.
		if ( is_string( $autosave ) && $autosave > $row['post_modified_gmt'] ) {
			\WP_CLI::warning( sprintf( 'Post %d has an autosave (%s) newer than the post (%s): the editor will offer the autosave, which lacks this migration.', $row['ID'], $autosave, $row['post_modified_gmt'] ) );
		}
	}

	/**
	 * Back up, then write.
	 *
	 * @param array<int,array<string,mixed>> $rows          Rows from `collect()`.
	 * @param bool                           $allow_flagged Write flagged posts too.
	 */
	private function apply( array $rows, bool $allow_flagged ): void {
		if ( ! Sgs_Motion_Migrate_Lock::available() ) {
			\WP_CLI::error( 'wp_check_post_lock() is not available, so editor locks cannot be checked. Nothing was written.' );
		}
		$locked = 0;
		$todo   = $this->select_rows( $rows, $allow_flagged, $locked );
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
		$before = $this->published_counts();
		$groups = array();
		foreach ( $todo as $row ) {
			$groups[ $row['post_type'] ][] = $row;
		}
		ksort( $groups );
		if ( isset( $groups['product'] ) ) {
			$groups = array( 'product' => $groups['product'] ) + $groups;
		}
		$written = 0;
		foreach ( $groups as $type => $group ) {
			foreach ( $group as $row ) {
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
				\WP_CLI::error( sprintf( 'Published counts changed after writing %s (before %s, after %s). Stopped. Roll back with: wp sgs motion-migrate --rollback=%s', $type, wp_json_encode( $before ), wp_json_encode( $after ), $backup ) );
			}
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
		$hint = sprintf( 'Roll back with: wp sgs motion-migrate --rollback=%s', $backup );
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
		$summary = sprintf( 'Wrote %d post(s); published counts unchanged.%s', $written, '' === $backup ? '' : ' Roll back with: wp sgs motion-migrate --rollback=' . $backup );
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
			\WP_CLI::error( 'Cannot read a motion-migrate backup at ' . $file );
		}
		if ( array() !== $result['failed'] ) {
			\WP_CLI::error( sprintf( 'Restored %d post(s); failed on: %s', $result['restored'], implode( ', ', $result['failed'] ) ) );
		}
		\WP_CLI::success( sprintf( 'Restored %d post(s).', $result['restored'] ) );
	}
}
