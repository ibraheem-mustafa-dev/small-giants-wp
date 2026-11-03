<?php
/**
 * Live-content sweep for attributes that became per-breakpoint objects (FW-F, FP-14), the generalised form of
 * migrate-gallery-layout.php.
 *
 * The rules are not written here: `python plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py --rules > rules.json`
 * derives them from block.json (`--rules-all` also lists the attributes still scalar, for the census before a type
 * change). Every top-level scalar member of a listed attribute in a `<!-- wp:sgs/... {...} -->` comment becomes
 * `{"desktop": value}` (an empty string becomes `{}`, a `conversions` entry wins); only that member is edited, as text, so
 * every other byte of the content stays as stored. Idempotent: a second run changes nothing.
 *
 * It covers every post type that can hold blocks (posts, pages, custom post types, wp_block, wp_template,
 * wp_template_part, wp_navigation, sgs_header, sgs_footer, sgs_drawer) in every status except auto-draft, revisions
 * excluded.
 *
 *   wp db export before-scalar-tier.sql
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-scalar-tier-live.php dry-run rules.json
 *   wp eval-file wp-content/plugins/sgs-blocks/scripts/migrate-scalar-tier-live.php apply rules.json [backup.json]
 *
 * `dry-run` prints the counts per post type and per block.attribute and writes nothing. `apply` writes with
 * `$wpdb->update()` (no kses, revision or save hook), clears the post cache, optionally saves the old content of every
 * changed post as JSON (`{ "<id>": "<content>" }`), then re-counts: the post count must be 0 or the run errors.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}

global $wpdb;

$mode = isset( $args[0] ) ? (string) $args[0] : '';
if ( ! in_array( $mode, array( 'dry-run', 'apply' ), true ) || empty( $args[1] ) || ! is_readable( (string) $args[1] ) ) {
	WP_CLI::error( 'Usage: dry-run|apply <rules.json> [backup.json]. Take a database backup first (`wp db export`).' );
}
$spec  = json_decode( (string) file_get_contents( (string) $args[1] ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local CLI rules file.
$rules = is_array( $spec ) && isset( $spec['rules'] ) && is_array( $spec['rules'] ) ? $spec['rules'] : array();
$conv  = is_array( $spec ) && isset( $spec['conversions'] ) && is_array( $spec['conversions'] ) ? $spec['conversions'] : array();
if ( array() === $rules ) {
	WP_CLI::error( 'The rules file has no rules.' );
}
$backup_file = isset( $args[2] ) ? (string) $args[2] : '';

/**
 * The replacement for one old scalar value, as JSON text.
 *
 * @param string $block Block name.
 * @param string $attr  Attribute.
 * @param mixed  $old   Old scalar.
 * @param array  $conv  Conversion tables keyed `block.attr`.
 * @return string
 */
$sgs_conv = static function ( string $block, string $attr, $old, array $conv ): string {
	$table = $conv[ $block . '.' . $attr ] ?? null;
	if ( is_array( $table ) && is_string( $old ) && array_key_exists( $old, $table ) ) {
		return empty( $table[ $old ] ) ? '{}' : (string) wp_json_encode( $table[ $old ] );
	}
	if ( '' === $old ) {
		return '{}';
	}
	return '{"desktop":' . wp_json_encode( $old ) . '}';
};

/**
 * Rewrite the wanted top-level scalar members of one attribute JSON object, as text.
 *
 * @param string   $json   Attribute JSON.
 * @param string[] $wanted Attribute names.
 * @param callable $make   fn( string $attr, mixed $old ): string replacement JSON.
 * @param array    $hits   Receives the attribute names rewritten (by reference).
 * @return string
 */
$sgs_members = static function ( string $json, array $wanted, callable $make, array &$hits ): string {
	$len   = strlen( $json );
	$depth = 0;
	$out   = '';
	$last  = 0;
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
			$key = substr( $json, $start + 1, $i - $start - 1 );
			if ( 1 !== $depth || ! in_array( $key, $wanted, true ) ) {
				continue;
			}
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
			$first = $json[ $j ] ?? '';
			if ( '{' === $first || '[' === $first ) {
				continue; // Already an object or list: nothing to do (the main loop descends into it).
			}
			$k = $j;
			if ( '"' === $first ) {
				for ( ++$k; $k < $len && '"' !== $json[ $k ]; $k++ ) {
					if ( '\\' === $json[ $k ] ) {
						++$k;
					}
				}
				++$k;
			} else {
				while ( $k < $len && false === strpos( ",}] \t\r\n", $json[ $k ] ) ) {
					++$k;
				}
			}
			$raw = substr( $json, $j, $k - $j );
			$old = json_decode( $raw, true );
			if ( null !== $old && ! is_array( $old ) ) {
				$out   .= substr( $json, $last, $j - $last ) . $make( $key, $old );
				$last   = $k;
				$hits[] = $key;
			}
			$i = $k - 1;
		}
	}
	return $out . substr( $json, $last );
};

/**
 * Rewrite every old-shape comment in one content string.
 *
 * @param string $content Post content.
 * @param array  $found   Receives "block.attr" per rewrite (by reference).
 * @return string
 */
$sgs_rewrite = static function ( string $content, array &$found ) use ( $rules, $conv, $sgs_members, $sgs_conv ): string {
	return (string) preg_replace_callback(
		'/<!--\s+wp:(sgs\/[a-z0-9-]+)\s+(\{.*?\})(\s+\/?-->)/s',
		static function ( array $m ) use ( &$found, $rules, $conv, $sgs_members, $sgs_conv ): string {
			if ( ! isset( $rules[ $m[1] ] ) ) {
				return $m[0];
			}
			$hits = array();
			$new  = $sgs_members(
				$m[2],
				$rules[ $m[1] ],
				static function ( string $attr, $old ) use ( $m, $conv, $sgs_conv ): string {
					return $sgs_conv( $m[1], $attr, $old, $conv );
				},
				$hits
			);
			if ( array() === $hits ) {
				return $m[0];
			}
			foreach ( $hits as $attr ) {
				$found[] = $m[1] . '.' . $attr;
			}
			return '<!-- wp:' . $m[1] . ' ' . $new . $m[3];
		},
		$content
	);
};

$types = array_values( array_unique( array_merge( get_post_types(), array( 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'sgs_header', 'sgs_footer', 'sgs_drawer' ) ) ) );
$types = array_values( array_diff( $types, array( 'attachment', 'revision', 'nav_menu_item' ) ) );

$sql  = "SELECT ID, post_type, post_status, post_content FROM {$wpdb->posts} WHERE post_content LIKE '%wp:sgs/%' AND post_status <> 'auto-draft' AND post_type <> 'revision'";
$rows = $wpdb->get_results( $sql ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL -- a one-off maintenance sweep with no variable input.

$per_type = array();
$per_attr = array();
$backup   = array();
$changed  = 0;
foreach ( $rows as $row ) {
	if ( ! in_array( $row->post_type, $types, true ) ) {
		continue;
	}
	$found = array();
	$new   = $sgs_rewrite( (string) $row->post_content, $found );
	if ( array() === $found ) {
		continue;
	}
	$per_type[ $row->post_type ] = ( $per_type[ $row->post_type ] ?? 0 ) + count( $found );
	foreach ( $found as $key ) {
		$per_attr[ $key ] = ( $per_attr[ $key ] ?? 0 ) + 1;
	}
	++$changed;
	$backup[ (string) $row->ID ] = $row->post_content;
	if ( 'apply' === $mode ) {
		$wpdb->update( $wpdb->posts, array( 'post_content' => $new ), array( 'ID' => (int) $row->ID ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- see the file header.
		clean_post_cache( (int) $row->ID );
	}
}

WP_CLI::log( ( 'apply' === $mode ? 'Rewrote' : 'Would rewrite' ) . ' old-shape values in ' . $changed . ' post(s):' );
foreach ( $per_type as $type => $count ) {
	WP_CLI::log( sprintf( '  %-18s %d value(s)', $type, $count ) );
}
arsort( $per_attr );
foreach ( array_slice( $per_attr, 0, 30, true ) as $key => $count ) {
	WP_CLI::log( sprintf( '    %-44s %d', $key, $count ) );
}
if ( array() === $per_type ) {
	WP_CLI::log( '  none' );
}
WP_CLI::log( 'TOTAL_VALUES=' . array_sum( $per_type ) . ' POSTS=' . $changed );

if ( 'apply' !== $mode ) {
	WP_CLI::success( 'Dry run: nothing written.' );
	return;
}
if ( '' !== $backup_file && array() !== $backup ) {
	file_put_contents( $backup_file, wp_json_encode( $backup ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- a CLI backup file the operator names.
	WP_CLI::log( 'Old content of the changed posts saved to ' . $backup_file );
}
$remaining = 0;
foreach ( $wpdb->get_results( $sql ) as $row ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL
	$left = array();
	$sgs_rewrite( (string) $row->post_content, $left );
	$remaining += count( $left );
}
if ( 0 !== $remaining ) {
	WP_CLI::error( $remaining . ' old-shape value(s) remain after the sweep.' );
}
WP_CLI::success( 'Post count of old-shape values: 0.' );
