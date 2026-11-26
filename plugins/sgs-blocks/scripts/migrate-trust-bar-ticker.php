<?php
/**
 * Saved-content sweep that stores the trust bar's default ticker (FP-14: the render carries no fallback, the saved
 * content is converted). Until this sweep, a trust bar whose `overflowMode` is `ticker` (or unset, or a value the block
 * does not know) and that stores no marquee layer was given the overflow-only marquee at render time. The sweep writes
 * exactly that layer (`includes/motion/data/trust-bar-default-ticker.json`) into the saved block, the way the render-time
 * filter added it: appended to `sgsMotion.elements.root.effects`, `v` set to 1 when missing. A bar that stores any
 * marquee layer (found by its effect, whatever its id or its values: `touchPause` or the older `pauseOnTouch`, any
 * range), a bar whose `overflowMode` is `wrap` or `drop`, and a bar whose `sgsMotion` or root `effects` is not a list
 * are left exactly as saved, as the filter left them. So no page renders differently after the sweep. Idempotent: a
 * second run finds nothing.
 *
 * It covers every post type that can hold blocks (posts, pages, custom post types, wp_block, wp_template,
 * wp_template_part, wp_navigation, sgs_header, sgs_footer, sgs_drawer) in every status except auto-draft, revisions
 * excluded, and every nesting depth.
 *
 *   wp db export before-trust-bar-ticker.sql
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-trust-bar-ticker.php            (dry run, the default)
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-trust-bar-ticker.php apply undo.json
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-trust-bar-ticker.php undo undo.json
 *
 * The dry run lists each bar that would change and writes nothing. `apply` parses each post with `parse_blocks()`, adds
 * the layer, re-serialises with `serialize_blocks()`, writes with `$wpdb->update()` (no kses, revision or save hook),
 * clears the post cache, saves the old content of every changed post as JSON (`{ "<id>": "<content>" }`) to the undo
 * file first, then re-counts: the number of bars left to convert must be 0 or the run errors. `undo` writes the saved
 * content back.
 *
 * Never run `apply` against a page open in the block editor: an editor save would overwrite the write.
 *
 * @package SGS\Blocks
 */

if ( ! function_exists( 'sgs_trust_bar_ticker_layer' ) ) {
	/**
	 * The default ticker layer, or null when the data file is missing, unreadable or not a marquee layer.
	 *
	 * @param string $file The data file.
	 * @return array<string,mixed>|null
	 */
	function sgs_trust_bar_ticker_layer( string $file ): ?array {
		if ( ! is_readable( $file ) ) {
			return null;
		}
		$decoded = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin data file.
		return is_array( $decoded ) && 'marquee' === ( $decoded['effect'] ?? null ) ? $decoded : null;
	}

	/**
	 * One block with the default ticker stored when it took it at render time, else unchanged. Mirrors the retired
	 * render-time filter (`Sgs_Motion_Ticker_Default::apply`) step for step.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @param array<string,mixed> $layer The default layer.
	 * @return array<string,mixed>|null The block with the layer stored, or null when it takes none.
	 */
	function sgs_trust_bar_ticker_stored( array $block, array $layer ): ?array {
		if ( 'sgs/trust-bar' !== ( $block['blockName'] ?? null ) ) {
			return null;
		}
		$attrs = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$raw   = isset( $attrs['overflowMode'] ) && is_scalar( $attrs['overflowMode'] ) ? (string) $attrs['overflowMode'] : ( isset( $attrs['overflowMode'] ) ? 'array' : 'ticker' );
		$mode  = (string) preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $raw ) );
		if ( 'ticker' !== $mode && 'wrap' !== $mode && 'drop' !== $mode ) {
			$mode = 'ticker';
		}
		if ( 'ticker' !== $mode ) {
			return null;
		}
		$motion = $attrs['sgsMotion'] ?? array();
		if ( ! is_array( $motion ) ) {
			return null;
		}
		$effects = $motion['elements']['root']['effects'] ?? array();
		if ( ! is_array( $effects ) ) {
			return null;
		}
		foreach ( $effects as $existing ) {
			if ( is_array( $existing ) && 'marquee' === ( $existing['effect'] ?? null ) ) {
				return null;
			}
		}
		$effects[]                             = $layer;
		$motion['v']                           = $motion['v'] ?? 1;
		$motion['elements']                    = isset( $motion['elements'] ) && is_array( $motion['elements'] ) ? $motion['elements'] : array();
		$motion['elements']['root']            = isset( $motion['elements']['root'] ) && is_array( $motion['elements']['root'] ) ? $motion['elements']['root'] : array();
		$motion['elements']['root']['effects'] = $effects;
		$attrs['sgsMotion']                    = $motion;
		$block['attrs']                        = $attrs;
		return $block;
	}

	/**
	 * Every block in a parsed list with the default ticker stored where it took it, depth-first.
	 *
	 * @param array<int,array<string,mixed>> $blocks Parsed blocks.
	 * @param array<string,mixed>            $layer  The default layer.
	 * @param array<int,string>              $found  Receives one note per converted bar (by reference).
	 * @return array<int,array<string,mixed>> The blocks, converted.
	 */
	function sgs_trust_bar_ticker_migrate( array $blocks, array $layer, array &$found ): array {
		foreach ( $blocks as $i => $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}
			$stored = sgs_trust_bar_ticker_stored( $block, $layer );
			if ( null !== $stored ) {
				$blocks[ $i ] = $stored;
				$others       = array_column( array_filter( (array) ( $stored['attrs']['sgsMotion']['elements']['root']['effects'] ?? array() ), 'is_array' ), 'effect' );
				$found[]      = 'overflowMode ' . sgs_trust_bar_ticker_json( $block['attrs']['overflowMode'] ?? null ) . '; root effects now ' . implode( ', ', $others );
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$blocks[ $i ]['innerBlocks'] = sgs_trust_bar_ticker_migrate( $block['innerBlocks'], $layer, $found );
			}
		}
		return $blocks;
	}

	/**
	 * A value as JSON (wp_json_encode when WordPress is loaded).
	 *
	 * @param mixed $value The value.
	 * @return string
	 */
	function sgs_trust_bar_ticker_json( $value ): string {
		return function_exists( 'wp_json_encode' ) ? (string) wp_json_encode( $value ) : (string) json_encode( $value );
	}
}

// A test loads the functions above alone (SGS_TRUST_BAR_TICKER_LIBRARY); the sweep runs only under WP-CLI.
if ( defined( 'SGS_TRUST_BAR_TICKER_LIBRARY' ) || ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	return;
}

global $wpdb;

$mode = isset( $args[0] ) ? (string) $args[0] : 'dry-run';
if ( ! in_array( $mode, array( 'dry-run', 'apply', 'undo' ), true ) ) {
	WP_CLI::error( 'Usage: [dry-run] | apply <undo.json> | undo <undo.json>. Take a database backup first (`wp db export`).' );
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

$sgs_ticker_layer = sgs_trust_bar_ticker_layer( dirname( __DIR__ ) . '/includes/motion/data/trust-bar-default-ticker.json' );
if ( null === $sgs_ticker_layer ) {
	WP_CLI::error( 'includes/motion/data/trust-bar-default-ticker.json is missing or holds no marquee layer; nothing was changed.' );
}

$types = array_values( array_unique( array_merge( get_post_types(), array( 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'sgs_header', 'sgs_footer', 'sgs_drawer' ) ) ) );
$types = array_values( array_diff( $types, array( 'attachment', 'revision', 'nav_menu_item' ) ) );

$sql  = "SELECT ID, post_type, post_status, post_title, post_content FROM {$wpdb->posts} WHERE post_content LIKE '%wp:sgs/trust-bar%' AND post_status <> 'auto-draft' AND post_type <> 'revision'";
$rows = $wpdb->get_results( $sql ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL -- a one-off maintenance sweep with no variable input.
if ( ! is_array( $rows ) ) {
	WP_CLI::error( 'The posts query failed; nothing was changed.' );
}

$undo    = array();
$writes  = array();
$changed = 0;
$total   = 0;
foreach ( $rows as $row ) {
	if ( ! in_array( $row->post_type, $types, true ) ) {
		continue;
	}
	$found = array();
	$new   = serialize_blocks( sgs_trust_bar_ticker_migrate( parse_blocks( (string) $row->post_content ), $sgs_ticker_layer, $found ) );
	if ( array() === $found ) {
		continue;
	}
	++$changed;
	$total                      += count( $found );
	$undo[ (string) $row->ID ]   = $row->post_content;
	$writes[ (string) $row->ID ] = $new;
	foreach ( $found as $note ) {
		WP_CLI::log( sprintf( '  #%d (%s, %s, "%s"): %s', $row->ID, $row->post_type, $row->post_status, $row->post_title ?? '', $note ) );
	}
}

WP_CLI::log( ( 'apply' === $mode ? 'Storing ' : 'Would store ' ) . 'the default ticker on ' . $total . ' trust bar(s) in ' . $changed . ' post(s).' );
WP_CLI::log( 'TOTAL_BARS=' . $total . ' POSTS=' . $changed );

if ( 'apply' !== $mode ) {
	WP_CLI::success( 'Dry run: nothing written.' );
	return;
}
// The undo file is written and read back before the first database write, so every changed post has its old content
// on disk even if a write fails part-way.
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
foreach ( (array) $wpdb->get_results( $sql ) as $row ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL
	if ( ! in_array( $row->post_type, $types, true ) ) {
		continue;
	}
	$left = array();
	sgs_trust_bar_ticker_migrate( parse_blocks( (string) $row->post_content ), $sgs_ticker_layer, $left );
	$remaining += count( $left );
}
if ( 0 !== $remaining ) {
	WP_CLI::error( $remaining . ' trust bar(s) still take the default ticker after the sweep.' );
}
WP_CLI::success( 'Trust bars left taking the default ticker: 0.' );
