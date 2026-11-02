<?php
/**
 * Live-content sweep for the sgs/gallery per-device layout (FW-E, FP-14).
 *
 * `sgs/gallery`'s `layout` was one string (`grid`, `masonry`, `carousel`); it is now a `{desktop, tablet, mobile}` object and
 * `render.php` never reads the old string. This rewrites every stored `<!-- wp:sgs/gallery {...} -->` block comment in the
 * database to the object shape, the same mapping as `plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py` uses for saved
 * files:
 *
 *   "grid"     -> {}                                    (the default, a grid at every width)
 *   "masonry"  -> {"desktop":"masonry"}                 (tablet and mobile inherit)
 *   "carousel" -> {"desktop":"carousel","tablet":"carousel","mobile":"carousel"}
 *
 * Only the `layout` member is rewritten, as text; every other byte of the comment stays as stored (an empty `{}` stays `{}`).
 *
 * It covers every post type that can hold blocks: posts, pages, custom post types, `wp_block`, `wp_template`,
 * `wp_template_part`, `wp_navigation` and `sgs_header`, `sgs_footer`, `sgs_drawer` (and any other registered type), in
 * every status except auto-drafts. Only the attribute JSON inside the gallery's own block comment is touched; the rest of
 * the content is byte-identical. Idempotent: a second run finds nothing to change.
 *
 * Run it from the site's WordPress root (WP-CLI), after taking a database backup:
 *
 *   wp db export before-gallery-layout.sql
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-gallery-layout.php dry-run
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-gallery-layout.php apply [backup.json]
 *
 * `dry-run` prints the counts and writes nothing. `apply` writes, and with a file name also saves the old content of every
 * changed post as JSON (`{ "<post id>": "<content>" }`), the undo for `wp post update <id> --post_content=...`. The pre and
 * post counts of old-shape galleries are printed per post type; after `apply` the post count must be 0.
 *
 * Content is written with `$wpdb->update()`, not `wp_update_post()`, so no kses filter, revision or save hook rewrites
 * anything else in the post, and the post cache is cleared per post.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}

global $wpdb;

$mode = isset( $args[0] ) ? (string) $args[0] : '';
if ( ! in_array( $mode, array( 'dry-run', 'apply' ), true ) ) {
	WP_CLI::error( 'Say what to do: `dry-run` or `apply [backup.json]`. Take a database backup first (`wp db export`).' );
}
$backup_file = isset( $args[1] ) ? (string) $args[1] : '';

/**
 * The object shape of an old scalar layout.
 *
 * @param string $layout Old value.
 * @return object|null Null when the value is not one of the three old strings.
 */
$sgs_layout_object = static function ( string $layout ) {
	switch ( $layout ) {
		case 'grid':
			return new stdClass();
		case 'masonry':
			return (object) array( 'desktop' => 'masonry' );
		case 'carousel':
			return (object) array(
				'desktop' => 'carousel',
				'tablet'  => 'carousel',
				'mobile'  => 'carousel',
			);
	}
	return null;
};

/**
 * The attribute JSON with its top-level `"layout":"<old>"` member replaced by the object shape, and nothing else touched.
 *
 * The rest of the JSON is left byte for byte as stored (an empty `{}` stays `{}`, key order and escaping stay), because it
 * is edited as text: a scanner walks the object, tracking string and nesting state, and rewrites only a string value whose
 * key is `layout` at the top level.
 *
 * @param string $json The attribute JSON (an object).
 * @return string|null The rewritten JSON, or null when the top-level layout is not one of the three old strings.
 */
$sgs_replace_layout = static function ( string $json ) use ( $sgs_layout_object ): ?string {
	$len   = strlen( $json );
	$depth = 0;
	for ( $i = 0; $i < $len; $i++ ) {
		$ch = $json[ $i ];
		if ( '{' === $ch || '[' === $ch ) {
			++$depth;
		} elseif ( '}' === $ch || ']' === $ch ) {
			--$depth;
		} elseif ( '"' === $ch ) {
			$start = $i;
			for ( ++$i; $i < $len && '"' !== $json[ $i ]; $i++ ) {
				if ( '\\' === $json[ $i ] ) {
					++$i;
				}
			}
			$literal = substr( $json, $start, $i - $start + 1 );
			if ( 1 !== $depth || '"layout"' !== $literal ) {
				continue;
			}
			// A key: skip to the value.
			$j = $i + 1;
			while ( $j < $len && ctype_space( $json[ $j ] ) ) {
				++$j;
			}
			if ( ':' !== ( $json[ $j ] ?? '' ) ) {
				continue;
			}
			++$j;
			while ( $j < $len && ctype_space( $json[ $j ] ) ) {
				++$j;
			}
			if ( '"' !== ( $json[ $j ] ?? '' ) ) {
				return null; // Already an object (or something else): nothing to do.
			}
			$end = $j;
			for ( ++$end; $end < $len && '"' !== $json[ $end ]; $end++ ) {
				if ( '\\' === $json[ $end ] ) {
					++$end;
				}
			}
			$old    = json_decode( substr( $json, $j, $end - $j + 1 ) );
			$object = is_string( $old ) ? $sgs_layout_object( $old ) : null;
			if ( null === $object ) {
				return null;
			}
			return substr( $json, 0, $j ) . wp_json_encode( $object ) . substr( $json, $end + 1 );
		}
	}
	return null;
};

/**
 * Rewrite the old-shape gallery comments in one content string.
 *
 * @param string $content Post content.
 * @param int    $found   Old-shape galleries seen (by reference).
 * @return string The content with every old-shape gallery rewritten.
 */
$sgs_rewrite = static function ( string $content, int &$found ) use ( $sgs_replace_layout ): string {
	return (string) preg_replace_callback(
		'/<!--\s+wp:sgs\/gallery\s+(\{.*?\})(\s+\/?-->)/s',
		static function ( array $m ) use ( &$found, $sgs_replace_layout ): string {
			$json = $sgs_replace_layout( $m[1] );
			if ( null === $json ) {
				return $m[0];
			}
			++$found;
			return '<!-- wp:sgs/gallery ' . $json . $m[2];
		},
		$content
	);
};

$types = array_values( array_unique( array_merge( get_post_types(), array( 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'sgs_header', 'sgs_footer', 'sgs_drawer' ) ) ) );
$types = array_values( array_diff( $types, array( 'attachment', 'revision', 'nav_menu_item' ) ) );

$rows = $wpdb->get_results(
	"SELECT ID, post_type, post_status, post_content FROM {$wpdb->posts} WHERE post_content LIKE '%wp:sgs/gallery%' AND post_status <> 'auto-draft' AND post_type <> 'revision'"
); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a one-off maintenance sweep; there is no API that lists posts by content across every type and status.

$per_type = array();
$backup   = array();
$changed  = 0;
foreach ( $rows as $row ) {
	if ( ! in_array( $row->post_type, $types, true ) ) {
		continue;
	}
	$found = 0;
	$new   = $sgs_rewrite( (string) $row->post_content, $found );
	if ( 0 === $found ) {
		continue;
	}
	$per_type[ $row->post_type ] = ( $per_type[ $row->post_type ] ?? 0 ) + $found;
	++$changed;
	$backup[ (string) $row->ID ] = $row->post_content;
	if ( 'apply' === $mode ) {
		$wpdb->update( $wpdb->posts, array( 'post_content' => $new ), array( 'ID' => (int) $row->ID ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- see the file header.
		clean_post_cache( (int) $row->ID );
	}
}

WP_CLI::log( ( 'apply' === $mode ? 'Rewrote' : 'Would rewrite' ) . ' old-shape sgs/gallery layouts in ' . $changed . ' post(s):' );
foreach ( $per_type as $type => $count ) {
	WP_CLI::log( sprintf( '  %-18s %d gallery block(s)', $type, $count ) );
}
if ( array() === $per_type ) {
	WP_CLI::log( '  none' );
}

if ( 'apply' === $mode ) {
	if ( '' !== $backup_file && array() !== $backup ) {
		file_put_contents( $backup_file, wp_json_encode( $backup ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- a CLI backup file the operator names.
		WP_CLI::log( 'Old content of the changed posts saved to ' . $backup_file );
	}
	$remaining = 0;
	foreach ( $wpdb->get_results( "SELECT post_content FROM {$wpdb->posts} WHERE post_content LIKE '%wp:sgs/gallery%' AND post_status <> 'auto-draft' AND post_type <> 'revision'" ) as $row ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$left       = 0;
		$sgs_rewrite( (string) $row->post_content, $left );
		$remaining += $left;
	}
	if ( 0 !== $remaining ) {
		WP_CLI::error( $remaining . ' old-shape gallery block(s) remain after the sweep.' );
	}
	WP_CLI::success( 'Post count of old-shape galleries: 0.' );
} else {
	WP_CLI::success( 'Dry run: nothing written.' );
}
