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
// The box-string rule (a string where a per-device box needs top/right/bottom/left): `box.attrs` {block: {attr: shape}} and
// `box.expansions` {"40px": {top,right,bottom,left}|null}, written by find-scalar-tier-attrs.py --rules --box-values. Python
// expands, this file only substitutes; null = refused (left as stored).
$box_spec   = is_array( $spec ) && isset( $spec['box'] ) && is_array( $spec['box'] ) ? $spec['box'] : array();
$box_attrs  = isset( $box_spec['attrs'] ) && is_array( $box_spec['attrs'] ) ? $box_spec['attrs'] : array();
$box_exp    = isset( $box_spec['expansions'] ) && is_array( $box_spec['expansions'] ) ? $box_spec['expansions'] : array();
$box_values = array();
$box_state  = array(
	'refused'    => 0,
	'unexpanded' => 0,
);
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

/**
 * The defects in one saved box attribute value: a list of [ tier|null, raw ].
 *
 * @param mixed $value Decoded value.
 * @return array
 */
$sgs_box_issues = static function ( $value ): array {
	$sides = array( 'top', 'right', 'bottom', 'left' );
	$tiers = array( 'desktop', 'tablet', 'mobile' );
	if ( null === $value ) {
		return array();
	}
	if ( ! is_array( $value ) ) {
		return array( array( null, $value ) );
	}
	if ( array() === $value || array_is_list( $value ) ) {
		return array();
	}
	if ( array() !== array_intersect( $tiers, array_keys( $value ) ) ) {
		$out = array();
		foreach ( $tiers as $t ) {
			if ( ! array_key_exists( $t, $value ) || null === $value[ $t ] ) {
				continue;
			}
			$v = $value[ $t ];
			if ( is_array( $v ) ) {
				if ( array() !== $v && ! array_is_list( $v ) && array() === array_intersect( $sides, array_keys( $v ) ) ) {
					$out[] = array( $t, $v );
				}
			} else {
				$out[] = array( $t, $v );
			}
		}
		return $out;
	}
	return array() === array_intersect( $sides, array_keys( $value ) ) ? array( array( null, $value ) ) : array();
};

/**
 * The end offset of the JSON value that starts at $j.
 *
 * @param string $json JSON text.
 * @param int    $j    Start offset.
 * @return int
 */
$sgs_value_end = static function ( string $json, int $j ): int {
	$len   = strlen( $json );
	$depth = 0;
	for ( $k = $j; $k < $len; $k++ ) {
		$ch = $json[ $k ];
		if ( '"' === $ch ) {
			for ( ++$k; $k < $len && '"' !== $json[ $k ]; $k++ ) {
				if ( '\\' === $json[ $k ] ) {
					++$k;
				}
			}
			if ( 0 === $depth ) {
				return $k + 1;
			}
		} elseif ( '{' === $ch || '[' === $ch ) {
			++$depth;
		} elseif ( '}' === $ch || ']' === $ch ) {
			--$depth;
			if ( 0 === $depth ) {
				return $k + 1;
			}
		} elseif ( 0 === $depth && false !== strpos( ",} \t\r\n", $ch ) ) {
			return $k;
		}
	}
	return $len;
};

/**
 * Rewrite the box-string defects of every included attribute in one content string, as text. A raw value whose expansion
 * is an object is substituted; a null expansion is counted as refused and kept; a value with no expansion is counted as
 * unexpanded and kept (the apply run then errors).
 *
 * @param string $content Post content.
 * @param array  $found   Receives "box:block.attr" per defect (by reference).
 * @return string
 */
$sgs_box_rewrite = static function ( string $content, array &$found ) use ( $box_attrs, $box_exp, $sgs_box_issues, $sgs_value_end, &$box_values, &$box_state ): string {
	if ( array() === $box_attrs ) {
		return $content;
	}
	return (string) preg_replace_callback(
		'/<!--\s+wp:(sgs\/[a-z0-9-]+)\s+(\{.*?\})(\s+\/?-->)/s',
		static function ( array $m ) use ( &$found, $box_attrs, $box_exp, $sgs_box_issues, $sgs_value_end, &$box_values, &$box_state ): string {
			if ( ! isset( $box_attrs[ $m[1] ] ) ) {
				return $m[0];
			}
			$json  = $m[2];
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
					if ( 1 !== $depth || ! isset( $box_attrs[ $m[1] ][ $key ] ) ) {
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
					$k      = $sgs_value_end( $json, $j );
					$value  = json_decode( substr( $json, $j, $k - $j ), true );
					$issues = $sgs_box_issues( $value );
					$i      = $k - 1;
					if ( array() === $issues ) {
						continue;
					}
					$new = $value;
					foreach ( $issues as $issue ) {
						list( $tier, $raw ) = $issue;
						$found[]            = 'box:' . $m[1] . '.' . $key;
						$id                 = is_array( $raw ) ? '' : (string) $raw;
						if ( '' !== $id ) {
							$box_values[ $id ] = true;
						}
						if ( is_array( $raw ) || ! array_key_exists( $id, $box_exp ) ) {
							++$box_state['unexpanded'];
							continue;
						}
						if ( null === $box_exp[ $id ] ) {
							++$box_state['refused'];
							continue;
						}
						$box = array() === $box_exp[ $id ] ? new stdClass() : $box_exp[ $id ];
						if ( null === $tier ) {
							$new = 'tiered' === $box_attrs[ $m[1] ][ $key ] ? array( 'desktop' => $box ) : $box;
						} else {
							$new[ $tier ] = $box;
						}
					}
					if ( $new !== $value ) {
						$out .= substr( $json, $last, $j - $last ) . wp_json_encode( $new, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
						$last = $k;
					}
				}
			}
			return '<!-- wp:' . $m[1] . ' ' . $out . substr( $json, $last ) . $m[3];
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
	$new   = $sgs_box_rewrite( $new, $found );
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
WP_CLI::log( 'BOX_STRING: refused=' . $box_state['refused'] . ' unexpanded=' . $box_state['unexpanded'] . ' distinct_values=' . count( $box_values ) );

if ( 'apply' !== $mode ) {
	if ( '' !== $backup_file && array() !== $box_values ) {
		// Dry run: the third argument names a file for the distinct box-string values, input of find-scalar-tier-attrs.py --rules --box-values.
		file_put_contents( $backup_file, wp_json_encode( array_keys( $box_values ) ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- a CLI file the operator names.
		WP_CLI::log( 'Distinct box-string values saved to ' . $backup_file );
	}
	WP_CLI::success( 'Dry run: nothing written.' );
	return;
}
if ( '' !== $backup_file && array() !== $backup ) {
	file_put_contents( $backup_file, wp_json_encode( $backup ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- a CLI backup file the operator names.
	WP_CLI::log( 'Old content of the changed posts saved to ' . $backup_file );
}
$remaining = 0;
$box_state = array(
	'refused'    => 0,
	'unexpanded' => 0,
);
foreach ( $wpdb->get_results( $sql ) as $row ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL
	$left = array();
	$sgs_rewrite( (string) $row->post_content, $left );
	$remaining += count( $left );
	$box_left = array();
	$sgs_box_rewrite( (string) $row->post_content, $box_left );
}
// A box-string value the rules file refused stays (listed in the refused file); any other that remains is an error.
if ( 0 !== $box_state['unexpanded'] ) {
	WP_CLI::error( $box_state['unexpanded'] . ' box-string value(s) have no expansion in the rules file: regenerate it from a fresh dry run (--box-values).' );
}
WP_CLI::log( 'Box-string values left because the rules refused them: ' . $box_state['refused'] );
if ( 0 !== $remaining ) {
	WP_CLI::error( $remaining . ' old-shape value(s) remain after the sweep.' );
}
WP_CLI::success( 'Post count of old-shape values: 0.' );
