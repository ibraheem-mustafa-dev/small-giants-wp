<?php
/**
 * `wp sgs media measure-tone` — backfills `_sgs_top_tone` attachment meta
 * (U-13 §4.3, .claude/reports/2026-09-26-u13-header-ink-design.md) on every
 * existing image attachment. New uploads are measured automatically by the
 * `wp_generate_attachment_metadata` filter in media-top-tone.php; this
 * command covers every image that existed BEFORE that filter shipped.
 *
 * Mirrors `Sgs_Cli_Commands`'s registration pattern (class-sgs-cli-commands.php):
 *
 *   if ( defined( 'WP_CLI' ) && WP_CLI ) {
 *       require_once SGS_BLOCKS_PATH . 'includes/class-sgs-media-cli-commands.php';
 *       \WP_CLI::add_command( 'sgs media', Sgs_Media_Cli_Commands::class );
 *   }
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// media-top-tone.php declares no function_exists() guard around its own
// declarations, so it must load at most once — require_once is idempotent
// if sgs-blocks.php's own bootstrap require already ran earlier in the
// same process (it always does on a real WP-CLI invocation; this guard only
// matters for a standalone test harness that loads this class directly).
require_once __DIR__ . '/media-top-tone.php';

/**
 * `wp sgs media measure-tone` WP-CLI command.
 *
 * ## EXAMPLES
 *
 *     wp sgs media measure-tone
 *     wp sgs media measure-tone --force
 */
final class Sgs_Media_Cli_Commands {

	/**
	 * Measure the top-20% tone of every image attachment that does not yet
	 * carry `_sgs_top_tone` meta (or, with --force, every image attachment).
	 *
	 * ## OPTIONS
	 *
	 * [--force]
	 * : Re-measure attachments that already carry `_sgs_top_tone` meta.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs media measure-tone
	 *     wp sgs media measure-tone --force
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments.
	 *
	 * @subcommand measure-tone
	 */
	public function measure_tone( array $args, array $assoc_args ): void {
		unset( $args );

		$force = ! empty( $assoc_args['force'] );

		$attachment_ids = \get_posts(
			array(
				'post_type'      => 'attachment',
				'post_mime_type' => 'image',
				'post_status'    => 'inherit',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);

		if ( empty( $attachment_ids ) ) {
			\WP_CLI::success( 'No image attachments found.' );
			return;
		}

		$measured = 0;
		$skipped  = 0;
		$failed   = 0;

		$progress = \WP_CLI\Utils\make_progress_bar( 'Measuring image top tone', count( $attachment_ids ) );

		foreach ( $attachment_ids as $attachment_id ) {
			$attachment_id = (int) $attachment_id;

			if ( ! $force && '' !== \sgs_media_top_tone( $attachment_id ) ) {
				++$skipped;
				$progress->tick();
				continue;
			}

			$file = \get_attached_file( $attachment_id );
			if ( ! is_string( $file ) || '' === $file || ! file_exists( $file ) ) {
				++$failed;
				$progress->tick();
				continue;
			}

			$luminance = \sgs_media_top_tone_measure_luminance( $file );
			if ( null === $luminance ) {
				++$failed;
				$progress->tick();
				continue;
			}

			$tone = \sgs_wcag_white_wins_for_luminance( $luminance ) ? 'dark' : 'light';
			\update_post_meta( $attachment_id, '_sgs_top_tone', $tone );
			++$measured;
			$progress->tick();
		}

		$progress->finish();

		\WP_CLI::success(
			sprintf(
				'Measured %d, skipped %d (already measured), failed %d (unreadable file or no usable image library).',
				$measured,
				$skipped,
				$failed
			)
		);
	}
}
