<?php
/**
 * Live-content sweep that moves the connector line style onto `connectorLineStyle` (FP-14: the render carries no
 * fallback, the saved content is converted).
 *
 * `sgs/timeline`: `connectorStyle` `dashed` or `dotted` becomes `connectorLineStyle` of the same value; the
 * `connectorStyle` key is removed in every case (the attribute no longer exists).
 * `sgs/process-steps`: `connectorStyle` `dashed` becomes `connectorStyle` `line` (key removed, the default) plus
 * `connectorLineStyle` `dashed`. `line`, `arrow` and `dots` are untouched.
 * Idempotent: a second run finds nothing.
 *
 * It covers every post type that can hold blocks (posts, pages, custom post types, wp_block, wp_template,
 * wp_template_part, wp_navigation, sgs_header, sgs_footer, sgs_drawer) in every status except auto-draft, revisions
 * excluded.
 *
 *   wp db export before-connector-line-style.sql
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-connector-line-style.php dry-run
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-connector-line-style.php apply undo.json
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-connector-line-style.php undo undo.json
 *
 * `dry-run` lists each block that would change and writes nothing. `apply` parses each post with `parse_blocks()`,
 * edits the matching blocks, re-serialises with `serialize_blocks()`, writes with `$wpdb->update()` (no kses, revision or
 * save hook), clears the post cache, saves the old content of every changed post as JSON (`{ "<id>": "<content>" }`) to
 * the undo file, then re-counts: the number of old-style connector blocks must be 0 or the run errors. `undo` writes the saved
 * content back.
 *
 * Never run `apply` against a page open in the block editor: an editor save would overwrite the write.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}

global $wpdb;

$mode = isset( $args[0] ) ? (string) $args[0] : '';
if ( ! in_array( $mode, array( 'dry-run', 'apply', 'undo' ), true ) ) {
	WP_CLI::error( 'Usage: dry-run | apply <undo.json> | undo <undo.json>. Take a database backup first (`wp db export`).' );
}
$undo_file = isset( $args[1] ) ? (string) $args[1] : '';
if ( 'apply' === $mode && '' === $undo_file ) {
	WP_CLI::error( 'apply needs an undo file path: apply <undo.json>.' );
}

if ( 'undo' === $mode ) {
	if ( '' === $undo_file || ! is_readable( $undo_file ) ) {
		WP_CLI::error( 'undo needs a readable undo file: undo <undo.json>.' );
	}
	$saved = json_decode( (string) file_get_contents( $undo_file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local CLI undo file.
	if ( ! is_array( $saved ) || array() === $saved ) {
		WP_CLI::error( 'The undo file holds no posts.' );
	}
	foreach ( $saved as $post_id => $content ) {
		$wpdb->update( $wpdb->posts, array( 'post_content' => (string) $content ), array( 'ID' => (int) $post_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- see the file header.
		clean_post_cache( (int) $post_id );
	}
	WP_CLI::success( 'Restored ' . count( $saved ) . ' post(s).' );
	return;
}

/**
 * Convert every timeline and process-steps connector style in a parsed block list, depth-first.
 *
 * @param array $blocks Parsed blocks.
 * @param array $found  Receives one note per converted block (by reference).
 * @return array The blocks, converted.
 */
$sgs_convert = static function ( array $blocks, array &$found ) use ( &$sgs_convert ): array {
	foreach ( $blocks as $i => $block ) {
		$name  = $block['blockName'] ?? null;
		$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
		if ( 'sgs/timeline' === $name && array_key_exists( 'connectorStyle', $attrs ) ) {
			$old = (string) $attrs['connectorStyle'];
			unset( $attrs['connectorStyle'] );
			if ( in_array( $old, array( 'dashed', 'dotted' ), true ) ) {
				$attrs['connectorLineStyle'] = $old;
			}
			$blocks[ $i ]['attrs'] = $attrs;
			$found[]               = 'timeline connectorStyle ' . $old . ' -> connectorLineStyle ' . ( $attrs['connectorLineStyle'] ?? 'solid' );
		} elseif ( 'sgs/process-steps' === $name && 'dashed' === ( $attrs['connectorStyle'] ?? null ) ) {
			unset( $attrs['connectorStyle'] );
			$attrs['connectorLineStyle'] = 'dashed';
			$blocks[ $i ]['attrs']       = $attrs;
			$found[]                     = 'process-steps connectorStyle dashed -> line + connectorLineStyle dashed';
		}
		if ( ! empty( $block['innerBlocks'] ) ) {
			$blocks[ $i ]['innerBlocks'] = $sgs_convert( $block['innerBlocks'], $found );
		}
	}
	return $blocks;
};

$types = array_values( array_unique( array_merge( get_post_types(), array( 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'sgs_header', 'sgs_footer', 'sgs_drawer' ) ) ) );
$types = array_values( array_diff( $types, array( 'attachment', 'revision', 'nav_menu_item' ) ) );

$sql  = "SELECT ID, post_type, post_status, post_content FROM {$wpdb->posts} WHERE ( post_content LIKE '%wp:sgs/timeline%' OR post_content LIKE '%wp:sgs/process-steps%' ) AND post_status <> 'auto-draft' AND post_type <> 'revision'";
$rows = $wpdb->get_results( $sql ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL -- a one-off maintenance sweep with no variable input.

$undo    = array();
$writes  = array();
$changed = 0;
$total   = 0;
foreach ( $rows as $row ) {
	if ( ! in_array( $row->post_type, $types, true ) ) {
		continue;
	}
	$found = array();
	$new   = serialize_blocks( $sgs_convert( parse_blocks( (string) $row->post_content ), $found ) );
	if ( array() === $found ) {
		continue;
	}
	++$changed;
	$total                  += count( $found );
	$undo[ (string) $row->ID ]   = $row->post_content;
	$writes[ (string) $row->ID ] = $new;
	foreach ( $found as $note ) {
		WP_CLI::log( sprintf( '  #%d (%s, %s): %s', $row->ID, $row->post_type, $row->post_status, $note ) );
	}
}

WP_CLI::log( ( 'apply' === $mode ? 'Converting ' : 'Would convert ' ) . $total . ' connector block(s) in ' . $changed . ' post(s).' );
WP_CLI::log( 'TOTAL_BLOCKS=' . $total . ' POSTS=' . $changed );

if ( 'apply' !== $mode ) {
	WP_CLI::success( 'Dry run: nothing written.' );
	return;
}
// The undo file is written and read back before the first database write, so every changed post has its old
// content on disk even if a write fails part-way.
if ( array() !== $undo ) {
	$undo_json = (string) wp_json_encode( $undo );
	file_put_contents( $undo_file, $undo_json ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- a CLI undo file the operator names.
	if ( ! is_readable( $undo_file ) || file_get_contents( $undo_file ) !== $undo_json ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- the local undo file just written.
		WP_CLI::error( 'Could not write the undo file ' . $undo_file . '; nothing was changed.' );
	}
	WP_CLI::log( 'Old content of the changed posts saved to ' . $undo_file );
}
$written = 0;
foreach ( $writes as $post_id => $new ) {
	$ok = $wpdb->update( $wpdb->posts, array( 'post_content' => $new ), array( 'ID' => (int) $post_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- see the file header.
	if ( false === $ok ) {
		WP_CLI::error( sprintf( 'Writing post %d failed after %d of %d post(s); restore with: undo %s', (int) $post_id, $written, count( $writes ), $undo_file ) );
	}
	clean_post_cache( (int) $post_id );
	++$written;
}
$remaining = 0;
foreach ( $wpdb->get_results( $sql ) as $row ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL
	$left = array();
	$sgs_convert( parse_blocks( (string) $row->post_content ), $left );
	$remaining += count( $left );
}
if ( 0 !== $remaining ) {
	WP_CLI::error( $remaining . ' old-style connector block(s) remain after the sweep.' );
}
WP_CLI::success( 'Old-style connector blocks remaining: 0.' );
