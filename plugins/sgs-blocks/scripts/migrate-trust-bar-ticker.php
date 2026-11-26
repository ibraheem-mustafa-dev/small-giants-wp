<?php
/**
 * Saved-content sweep that gives every saved trust bar with no marquee of its own the overflow-only ticker, so it
 * scrolls when its badges do not fit one line (Bean: "the trust bar scrolls as a ticker when its items do not fit",
 * `.claude/plans/2026-11-24-clone-root-fixes.md` "Settled by Bean"). A fix, so it applies to every site. Real client bars
 * already store their marquee layer (2026-11-26: eye-care-test's header part 199, Mama's live 154, 176 and 178), so on a
 * deployed site the sweep changes only bars with no layer: each renders differently only where its badges do not fit one
 * line (there it scrolls instead of wrapping) and keeps its layout where they fit. The dry run lists every bar it would
 * change, and every bar it skips, per post, so each site's changed pages are known before `apply`. FP-14: the render
 * carries no default, the saved content holds the layer.
 *
 * A bar takes the ticker when its `overflowMode` is `ticker`, unset or a value the block does not know, and it stores
 * no marquee layer: the sweep appends the layer in `includes/motion/data/trust-bar-default-ticker.json` to
 * `sgsMotion.elements.root.effects` (`v` set to 1 when missing), the same layer the inspector's Ticker and a newly
 * inserted bar store. A bar that stores any marquee layer (found by its effect, whatever its id or values: `touchPause`
 * or the older `pauseOnTouch`, any range), a bar whose `overflowMode` is `wrap` or `drop`, and a bar whose `sgsMotion`
 * or root `effects` is not a list are left exactly as saved. Idempotent: a second run finds nothing.
 *
 * Skipped by default, and named in the dry run: every post whose title starts with "[probe]" (a probe page, such as
 * eye-care-test page 46 "[probe] trust-bar controls", whose bars are test fixtures, not site content), and the bars in
 * SGS_TRUST_BAR_TICKER_EXCLUDE, matched by a unique class on any post: `m515-control`, the marquee probe's negative
 * control on the canary's motion-QA fixture page 5305 that must never run (`scripts/motion-qa/probe-marquee.mjs`,
 * `.claude/rules/motion-qa.md`). An entry that matches no bar is printed as a warning. `include-excluded` as an extra
 * argument sweeps them too.
 *
 * It covers `post_content` of every post type that can hold blocks (posts, pages, custom post types, wp_block,
 * wp_template, wp_template_part, wp_navigation, sgs_header, sgs_footer, sgs_drawer) in every status except auto-draft,
 * at every nesting depth. Revisions, widgets, post meta and options are not touched (no trust bar was found outside
 * `post_content` on the eight installs, 2026-11-26).
 *
 *   wp db export before-trust-bar-ticker.sql
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-trust-bar-ticker.php            (dry run, the default)
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-trust-bar-ticker.php apply ~/trust-bar-undo-<site>.json
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-trust-bar-ticker.php undo ~/trust-bar-undo-<site>.json
 *
 * The dry run lists each bar that would change and writes nothing. `apply` parses each post with `parse_blocks()`, adds
 * the layer, re-serialises with `serialize_blocks()`, writes the undo file first (`{ "<id>": { "before": <old content>,
 * "after": <written content> } }`, read back and decoded to the same posts, or nothing is written), writes with
 * `$wpdb->update()` (no kses, revision or save hook), clears the post cache, then re-counts: the number of bars left to
 * convert must be 0 or the run errors. The undo file holds drafts and template parts, so `apply` refuses a path inside
 * the site's folder (ABSPATH, where the web server could serve it) and a file that already exists (it is never
 * overwritten). `undo` writes each post's old content back; a post that already holds its old content (a write that
 * failed part-way, or an undo run before) is skipped, and `undo` refuses, naming each post, when a post holds neither what
 * `apply` wrote nor its old content (an editor save since), so a later edit is never overwritten. A failed posts query is
 * an error, never "nothing to do".
 *
 * Never run `apply` against a page open in the block editor: an editor save would overwrite the write.
 *
 * @package SGS\Blocks
 */

/**
 * Bars the sweep skips unless run with `include-excluded`: a unique class the bar's `className` carries, on any post,
 * with why.
 */
const SGS_TRUST_BAR_TICKER_EXCLUDE = array(
	array(
		'class' => 'm515-control',
		'why'   => 'the marquee probe\'s negative control on motion-QA fixture page 5305 must never run',
	),
);

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
	 * @param array<int,string>              $skip   Classes whose bar is skipped (a skipped bar is noted in $found as
	 *                                              "skipped ...", never converted).
	 * @return array<int,array<string,mixed>> The blocks, converted.
	 */
	function sgs_trust_bar_ticker_migrate( array $blocks, array $layer, array &$found, array $skip = array() ): array {
		foreach ( $blocks as $i => $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}
			$stored  = sgs_trust_bar_ticker_stored( $block, $layer );
			$classes = preg_split( '/\s+/', (string) ( $block['attrs']['className'] ?? '' ) );
			$skipped = null !== $stored ? array_values( array_intersect( $skip, $classes ) ) : array();
			if ( array() !== $skipped ) {
				$found[] = 'skipped (excluded: ' . implode( ', ', $skipped ) . ')';
			} elseif ( null !== $stored ) {
				$blocks[ $i ] = $stored;
				$others       = array_column( array_filter( (array) ( $stored['attrs']['sgsMotion']['elements']['root']['effects'] ?? array() ), 'is_array' ), 'effect' );
				$found[]      = 'overflowMode ' . sgs_trust_bar_ticker_json( $block['attrs']['overflowMode'] ?? null ) . '; root effects now ' . implode( ', ', $others );
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$blocks[ $i ]['innerBlocks'] = sgs_trust_bar_ticker_migrate( $block['innerBlocks'], $layer, $found, $skip );
			}
		}
		return $blocks;
	}

	/**
	 * The classes whose bars the sweep skips.
	 *
	 * @param array<int,array<string,mixed>> $exclude The exclude list.
	 * @return array<int,string>
	 */
	function sgs_trust_bar_ticker_skip_classes( array $exclude ): array {
		return array_values( array_map( static fn( $e ) => (string) $e['class'], $exclude ) );
	}

	/**
	 * The exclude entries no bar matched in a run (each is a warning: the list names a bar that is gone or renamed).
	 *
	 * @param array<int,array<string,mixed>> $exclude The exclude list.
	 * @param array<int,string>              $notes   Every note the run's migrate calls gave.
	 * @return array<int,string> The unmatched classes.
	 */
	function sgs_trust_bar_ticker_unmatched_excludes( array $exclude, array $notes ): array {
		$hit = array();
		foreach ( $notes as $note ) {
			if ( preg_match( '/^skipped \(excluded: (.+)\)$/', (string) $note, $m ) ) {
				$hit = array_merge( $hit, array_map( 'trim', explode( ',', $m[1] ) ) );
			}
		}
		return array_values( array_diff( sgs_trust_bar_ticker_skip_classes( $exclude ), $hit ) );
	}

	/**
	 * Why an undo file path may not be written, or null when it may: the file already exists, its folder does not, or it
	 * resolves inside the site's folder (where the web server could serve it).
	 *
	 * @param string $path    The undo file path as given (relative paths resolve against the working folder).
	 * @param string $abspath The site's folder (ABSPATH).
	 * @return string|null
	 */
	function sgs_trust_bar_ticker_undo_path_problem( string $path, string $abspath ): ?string {
		if ( file_exists( $path ) ) {
			return sprintf( '%s already exists; the sweep never overwrites an undo file', $path );
		}
		$dir = realpath( dirname( $path ) );
		if ( false === $dir ) {
			return sprintf( 'the folder of %s does not exist', $path );
		}
		$site = realpath( $abspath );
		$norm = static fn( string $p ): string => rtrim( str_replace( '\\', '/', strtolower( $p ) ), '/' ) . '/';
		if ( false !== $site && 0 === strpos( $norm( $dir ), $norm( $site ) ) ) {
			return sprintf( '%s is inside the site folder %s, where the web server could serve it; use a path outside it, such as ~/trust-bar-undo-<site>.json', $path, $site );
		}
		return null;
	}

	/**
	 * Whether a post is a probe page (its title starts with "[probe]"), whose bars are test fixtures.
	 *
	 * @param string $title The post title.
	 * @return bool
	 */
	function sgs_trust_bar_ticker_probe_page( string $title ): bool {
		return 0 === stripos( ltrim( $title ), '[probe]' );
	}

	/**
	 * The undo file's JSON for the changed posts, or null when it cannot be encoded or does not decode back to the same
	 * posts (the run must then write nothing).
	 *
	 * @param array<string,array{before:string,after:string}> $undo   Old and written content by post id.
	 * @param callable|null                                   $encode The encoder (default wp_json_encode, which may
	 *                                                                rewrite content that is not UTF-8).
	 * @return string|null
	 */
	function sgs_trust_bar_ticker_undo_json( array $undo, ?callable $encode = null ): ?string {
		$encode = $encode ?? ( function_exists( 'wp_json_encode' ) ? 'wp_json_encode' : 'json_encode' );
		$json   = $encode( $undo );
		if ( ! is_string( $json ) || '' === $json ) {
			return null;
		}
		return json_decode( $json, true ) === $undo ? $json : null;
	}

	/**
	 * The posts an undo must not restore: each one whose current content is neither what `apply` wrote nor its old content,
	 * or whose saved entry is malformed. Empty when every post can be restored or already holds its old content.
	 *
	 * @param array<mixed>  $saved   The decoded undo file.
	 * @param callable      $current Returns a post's current content, or null when the post is gone.
	 * @return array<int,string> One line per refused post.
	 */
	function sgs_trust_bar_ticker_undo_conflicts( array $saved, callable $current ): array {
		$out = array();
		foreach ( $saved as $post_id => $entry ) {
			if ( ! is_array( $entry ) || ! is_string( $entry['before'] ?? null ) || ! is_string( $entry['after'] ?? null ) ) {
				$out[] = sprintf( 'post %s: the undo entry holds no before and after content', $post_id );
				continue;
			}
			$now = $current( (int) $post_id );
			if ( null === $now ) {
				$out[] = sprintf( 'post %s: no longer exists', $post_id );
			} elseif ( $now !== $entry['after'] && $now !== $entry['before'] ) {
				$out[] = sprintf( 'post %s: changed since the sweep wrote it', $post_id );
			}
		}
		return $out;
	}

	/**
	 * The posts an undo writes back: each one that still holds what `apply` wrote (a post already holding its old
	 * content is skipped). Run only after sgs_trust_bar_ticker_undo_conflicts() found none.
	 *
	 * @param array<mixed> $saved   The decoded undo file.
	 * @param callable     $current Returns a post's current content, or null when the post is gone.
	 * @return array<int,int> Post ids.
	 */
	function sgs_trust_bar_ticker_undo_restore( array $saved, callable $current ): array {
		$out = array();
		foreach ( $saved as $post_id => $entry ) {
			if ( is_array( $entry ) && $current( (int) $post_id ) === ( $entry['after'] ?? null ) ) {
				$out[] = (int) $post_id;
			}
		}
		return $out;
	}

	/**
	 * The rows of a posts query, or null when the query failed (a null result or a database error).
	 *
	 * @param mixed  $rows       `$wpdb->get_results()`'s result.
	 * @param string $last_error `$wpdb->last_error` after it.
	 * @return array<int,object>|null
	 */
	function sgs_trust_bar_ticker_rows( $rows, string $last_error ): ?array {
		return is_array( $rows ) && '' === $last_error ? $rows : null;
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
	WP_CLI::error( 'Usage: [dry-run] | apply <undo.json> | undo <undo.json> [include-excluded]. Take a database backup first (`wp db export`).' );
}
$undo_file        = 'dry-run' !== $mode && isset( $args[1] ) ? (string) $args[1] : '';
$include_excluded = in_array( 'include-excluded', array_map( 'strval', (array) $args ), true );
if ( 'apply' === $mode && ( '' === $undo_file || 'include-excluded' === $undo_file ) ) {
	WP_CLI::error( 'apply needs an undo file path outside the site: apply ~/trust-bar-undo-<site>.json.' );
}
if ( 'apply' === $mode ) {
	$sgs_path_problem = sgs_trust_bar_ticker_undo_path_problem( $undo_file, ABSPATH );
	if ( null !== $sgs_path_problem ) {
		WP_CLI::error( $sgs_path_problem . '; nothing was changed.' );
	}
}

// A post's current content, or null when it is gone.
$sgs_current = static function ( int $post_id ) use ( $wpdb ): ?string {
	$content = $wpdb->get_var( $wpdb->prepare( "SELECT post_content FROM {$wpdb->posts} WHERE ID = %d", $post_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- see the file header.
	return null === $content || '' !== $wpdb->last_error ? null : (string) $content;
};

if ( 'undo' === $mode ) {
	if ( '' === $undo_file || ! is_readable( $undo_file ) ) {
		WP_CLI::error( 'undo needs a readable undo file: undo <undo.json>.' );
	}
	$saved = json_decode( (string) file_get_contents( $undo_file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local CLI undo file.
	if ( ! is_array( $saved ) || array() === $saved ) {
		WP_CLI::error( 'The undo file holds no posts.' );
	}
	$conflicts = sgs_trust_bar_ticker_undo_conflicts( $saved, $sgs_current );
	if ( array() !== $conflicts ) {
		foreach ( $conflicts as $line ) {
			WP_CLI::log( '  ' . $line );
		}
		WP_CLI::error( count( $conflicts ) . ' post(s) no longer hold what the sweep wrote; nothing was restored. Restore them by hand from the undo file or the database backup.' );
	}
	$restore = sgs_trust_bar_ticker_undo_restore( $saved, $sgs_current );
	foreach ( $restore as $post_id ) {
		$ok = $wpdb->update( $wpdb->posts, array( 'post_content' => (string) $saved[ $post_id ]['before'] ), array( 'ID' => $post_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- see the file header.
		if ( false === $ok ) {
			WP_CLI::error( sprintf( 'Restoring post %d failed; run undo again to finish (restored posts are skipped).', $post_id ) );
		}
		clean_post_cache( $post_id );
	}
	WP_CLI::success( 'Restored ' . count( $restore ) . ' post(s); ' . ( count( $saved ) - count( $restore ) ) . ' already held their old content.' );
	return;
}

$sgs_ticker_layer = sgs_trust_bar_ticker_layer( dirname( __DIR__ ) . '/includes/motion/data/trust-bar-default-ticker.json' );
if ( null === $sgs_ticker_layer ) {
	WP_CLI::error( 'includes/motion/data/trust-bar-default-ticker.json is missing or holds no marquee layer; nothing was changed.' );
}
$sgs_exclude = $include_excluded ? array() : SGS_TRUST_BAR_TICKER_EXCLUDE;
$sgs_skip    = sgs_trust_bar_ticker_skip_classes( $sgs_exclude );
$sgs_notes   = array();

$types = array_values( array_unique( array_merge( get_post_types(), array( 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'sgs_header', 'sgs_footer', 'sgs_drawer' ) ) ) );
$types = array_values( array_diff( $types, array( 'attachment', 'revision', 'nav_menu_item' ) ) );

$sql = "SELECT ID, post_type, post_status, post_title, post_content FROM {$wpdb->posts} WHERE post_content LIKE '%wp:sgs/trust-bar%' AND post_status <> 'auto-draft' AND post_type <> 'revision'";
// A bar's notes: what each one changed, and the bars the exclude list skipped.
$sgs_converted = static fn( array $notes ): array => array_values( array_filter( $notes, static fn( $n ) => 0 !== strpos( $n, 'skipped' ) ) );

$rows = sgs_trust_bar_ticker_rows( $wpdb->get_results( $sql ), (string) $wpdb->last_error ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL -- a one-off maintenance sweep with no variable input.
if ( null === $rows ) {
	WP_CLI::error( 'The posts query failed (' . $wpdb->last_error . '); nothing was changed.' );
}

$undo    = array();
$writes  = array();
$changed = 0;
$total   = 0;
foreach ( $rows as $row ) {
	if ( ! in_array( $row->post_type, $types, true ) ) {
		continue;
	}
	if ( ! $include_excluded && sgs_trust_bar_ticker_probe_page( (string) ( $row->post_title ?? '' ) ) ) {
		WP_CLI::log( sprintf( '  #%d (%s, %s, "%s"): skipped (a probe page)', $row->ID, $row->post_type, $row->post_status, $row->post_title ?? '' ) );
		continue;
	}
	$found = array();
	$new   = serialize_blocks( sgs_trust_bar_ticker_migrate( parse_blocks( (string) $row->post_content ), $sgs_ticker_layer, $found, $sgs_skip ) );
	$sgs_notes = array_merge( $sgs_notes, $found );
	foreach ( $found as $note ) {
		WP_CLI::log( sprintf( '  #%d (%s, %s, "%s"): %s', $row->ID, $row->post_type, $row->post_status, $row->post_title ?? '', $note ) );
	}
	if ( array() === $sgs_converted( $found ) ) {
		continue;
	}
	++$changed;
	$total                      += count( $sgs_converted( $found ) );
	$undo[ (string) $row->ID ]   = array(
		'before' => (string) $row->post_content,
		'after'  => $new,
	);
	$writes[ (string) $row->ID ] = $new;
}

WP_CLI::log( ( 'apply' === $mode ? 'Storing ' : 'Would store ' ) . 'the overflow ticker on ' . $total . ' trust bar(s) in ' . $changed . ' post(s). Each renders differently only where its badges do not fit one line.' );
WP_CLI::log( 'TOTAL_BARS=' . $total . ' POSTS=' . $changed );
foreach ( sgs_trust_bar_ticker_unmatched_excludes( $sgs_exclude, $sgs_notes ) as $sgs_class ) {
	WP_CLI::warning( sprintf( 'The exclude entry %s matched no bar that would take the ticker on this site.', $sgs_class ) );
}

if ( 'apply' !== $mode ) {
	WP_CLI::success( 'Dry run: nothing written.' );
	return;
}
// The undo file is written, read back and decoded to the same posts before the first database write, so every changed
// post has its old content on disk even if a write fails part-way.
if ( array() !== $undo ) {
	$undo_json = sgs_trust_bar_ticker_undo_json( $undo );
	if ( null === $undo_json ) {
		WP_CLI::error( 'The undo content could not be encoded as JSON that decodes back to the same posts; nothing was changed.' );
	}
	file_put_contents( $undo_file, $undo_json ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- a CLI undo file the operator names.
	if ( ! is_readable( $undo_file ) || file_get_contents( $undo_file ) !== $undo_json ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- the local undo file just written.
		WP_CLI::error( 'Could not write the undo file ' . $undo_file . '; nothing was changed.' );
	}
	WP_CLI::log( 'Old and written content of the changed posts saved to ' . $undo_file );
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
$after = sgs_trust_bar_ticker_rows( $wpdb->get_results( $sql ), (string) $wpdb->last_error ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL
if ( null === $after ) {
	WP_CLI::error( 'The re-count query failed (' . $wpdb->last_error . '); check the posts by hand or restore with: undo ' . $undo_file );
}
$remaining = 0;
foreach ( $after as $row ) {
	if ( ! in_array( $row->post_type, $types, true ) ) {
		continue;
	}
	if ( ! $include_excluded && sgs_trust_bar_ticker_probe_page( (string) ( $row->post_title ?? '' ) ) ) {
		continue;
	}
	$left = array();
	sgs_trust_bar_ticker_migrate( parse_blocks( (string) $row->post_content ), $sgs_ticker_layer, $left, $sgs_skip );
	$remaining += count( $sgs_converted( $left ) );
}
if ( 0 !== $remaining ) {
	WP_CLI::error( $remaining . ' trust bar(s) still take the overflow ticker after the sweep.' );
}
WP_CLI::success( 'Trust bars left to give the overflow ticker: 0.' );
