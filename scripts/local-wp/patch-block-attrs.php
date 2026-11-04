<?php
/**
 * Patches the block settings of one post on a local mirror, by block className, without touching anything else.
 *
 * Run through scripts/local-wp/patch-block-attrs.py (it calls `wp eval-file` inside WSL); never on a Hostinger site.
 * Arguments (from wp eval-file): <post-id> <patch-file.json> [dry-run]
 *
 * Patch file: a JSON list of operations, each matching blocks whose className holds the token `match`
 * (e.g. "cr-ref-home-19"), optionally narrowed by `block` (e.g. "sgs/container"):
 *   { "match": "cr-ref-home-19", "set": { "boxAspectRatio": "1 / 1", "overflow": "hidden" } }
 *   { "match": "cr-ref-home-10", "unset": [ "fontSize", "lineHeight" ] }
 *   { "match": "cr-ref-home-96", "replace": "<!-- wp:sgs/multi-button {...} --> ... <!-- /wp:sgs/multi-button -->" }
 *   { "match": "cr-ref-home-74", "remove": true }
 *   { "match": "cr-ref-home-91", "append": "<!-- wp:sgs/text {...} /-->" }   (adds inner blocks at the end)
 * `set` replaces each named top-level attribute whole (a box padding object is written whole, never merged). An empty
 * JSON object `{}` decodes to an empty array and serialises as `[]`, so unset an attribute rather than setting it to `{}`.
 * Every operation must match exactly one block unless it says "all": true; otherwise nothing is written.
 *
 * Before writing, the post's content is saved to /var/www/<site>-backups/<post>-<UTC time>.html. The content is
 * written with wp_slash() (wp_update_post strips one level of backslashes, which would break escaped JSON in
 * block comments).
 *
 * @package SGS
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}

$sgs_pba_args    = isset( $args ) ? (array) $args : array();
$sgs_pba_post_id = isset( $sgs_pba_args[0] ) ? absint( $sgs_pba_args[0] ) : 0;
$sgs_pba_file    = isset( $sgs_pba_args[1] ) ? (string) $sgs_pba_args[1] : '';
$sgs_pba_dry     = in_array( 'dry-run', $sgs_pba_args, true );

// The sgsCustomCss save filter strips every sgsCustomCss attribute in the post unless the writer may post unfiltered
// HTML, so a write without an administrator would silently delete Custom CSS the patch never touched.
if ( ! current_user_can( 'unfiltered_html' ) ) {
	WP_CLI::error( 'Run as an administrator (patch-block-attrs.py passes --user=1): without unfiltered_html, saving strips every sgsCustomCss in the post.' );
}

$sgs_pba_post = $sgs_pba_post_id ? get_post( $sgs_pba_post_id ) : null;
if ( ! $sgs_pba_post ) {
	WP_CLI::error( 'No post with that id.' );
}
if ( '' === $sgs_pba_file || ! is_readable( $sgs_pba_file ) ) {
	WP_CLI::error( 'Patch file not readable: ' . $sgs_pba_file );
}
$sgs_pba_ops = json_decode( (string) file_get_contents( $sgs_pba_file ), true );
if ( ! is_array( $sgs_pba_ops ) ) {
	WP_CLI::error( 'Patch file is not a JSON list: ' . json_last_error_msg() );
}

$sgs_pba_blocks = parse_blocks( $sgs_pba_post->post_content );
$sgs_pba_hits   = array_fill( 0, count( $sgs_pba_ops ), 0 );

$sgs_pba_matches = static function ( array $block, array $op ): bool {
	if ( empty( $block['blockName'] ) ) {
		return false;
	}
	if ( ! empty( $op['block'] ) && $op['block'] !== $block['blockName'] ) {
		return false;
	}
	$classes = preg_split( '/\s+/', (string) ( $block['attrs']['className'] ?? '' ) );
	return in_array( (string) $op['match'], $classes, true );
};

// Inner HTML of a parsed block keeps one null placeholder per inner block in innerContent; adding or removing an
// inner block must keep those in step, so they are rebuilt from the inner block list.
$sgs_pba_rebuild_inner_content = static function ( array $block ): array {
	$html = array_values( array_filter( $block['innerContent'], 'is_string' ) );
	if ( empty( $block['innerBlocks'] ) ) {
		$block['innerContent'] = array( implode( '', $html ) );
		return $block;
	}
	$open                  = $html[0] ?? '';
	$close                 = count( $html ) > 1 ? $html[ count( $html ) - 1 ] : '';
	$block['innerContent'] = array_merge( array( $open ), array_fill( 0, count( $block['innerBlocks'] ), null ), array( $close ) );
	return $block;
};

// The attribute names a block type declares (supports-added ones such as className and anchor are registered
// attributes too). lock and metadata are block-comment keys every block accepts. A name outside this set is stored
// in the comment, never read by the block and silently does nothing, so a `set` of one is refused.
$sgs_pba_undeclared = array();
$sgs_pba_declared   = static function ( string $block_name ): ?array {
	$type = WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	if ( ! $type ) {
		return null;
	}
	return array_merge( array_keys( (array) $type->attributes ), array( 'lock', 'metadata' ) );
};

$sgs_pba_walk = static function ( array $blocks ) use ( &$sgs_pba_walk, $sgs_pba_ops, &$sgs_pba_hits, &$sgs_pba_undeclared, $sgs_pba_declared, $sgs_pba_matches, $sgs_pba_rebuild_inner_content ): array {
	$out = array();
	foreach ( $blocks as $block ) {
		$drop = false;
		$swap = null;
		foreach ( $sgs_pba_ops as $i => $op ) {
			if ( ! $sgs_pba_matches( $block, $op ) ) {
				continue;
			}
			++$sgs_pba_hits[ $i ];
			if ( ! empty( $op['remove'] ) ) {
				$drop = true;
			}
			if ( isset( $op['replace'] ) ) {
				$swap = array_values( array_filter( parse_blocks( (string) $op['replace'] ), static fn( $b ) => ! empty( $b['blockName'] ) ) );
			}
			$declared = $sgs_pba_declared( (string) $block['blockName'] );
			foreach ( (array) ( $op['set'] ?? array() ) as $key => $value ) {
				if ( null === $declared ) {
					$sgs_pba_undeclared[] = sprintf( '%s: %s is not a registered block type', (string) $op['match'], (string) $block['blockName'] );
				} elseif ( ! in_array( (string) $key, $declared, true ) ) {
					$sgs_pba_undeclared[] = sprintf( '%s: %s declares no attribute "%s"', (string) $op['match'], (string) $block['blockName'], (string) $key );
				}
				$block['attrs'][ $key ] = $value;
			}
			foreach ( (array) ( $op['unset'] ?? array() ) as $key ) {
				unset( $block['attrs'][ $key ] );
			}
			if ( isset( $op['append'] ) ) {
				$new                  = array_values( array_filter( parse_blocks( (string) $op['append'] ), static fn( $b ) => ! empty( $b['blockName'] ) ) );
				$block['innerBlocks'] = array_merge( $block['innerBlocks'], $new );
				$block                = $sgs_pba_rebuild_inner_content( $block );
			}
		}
		if ( $drop ) {
			continue;
		}
		if ( null !== $swap ) {
			foreach ( $swap as $s ) {
				$out[] = $s;
			}
			continue;
		}
		if ( ! empty( $block['innerBlocks'] ) ) {
			$before               = count( $block['innerBlocks'] );
			$block['innerBlocks'] = $sgs_pba_walk( $block['innerBlocks'] );
			if ( count( $block['innerBlocks'] ) !== $before ) {
				$block = $sgs_pba_rebuild_inner_content( $block );
			}
		}
		$out[] = $block;
	}
	return $out;
};

$sgs_pba_new = $sgs_pba_walk( $sgs_pba_blocks );

$sgs_pba_bad = array();
foreach ( $sgs_pba_ops as $i => $op ) {
	$want_all = ! empty( $op['all'] );
	if ( ( $want_all && 0 === $sgs_pba_hits[ $i ] ) || ( ! $want_all && 1 !== $sgs_pba_hits[ $i ] ) ) {
		$sgs_pba_bad[] = sprintf( '%s matched %d block(s)', (string) $op['match'], $sgs_pba_hits[ $i ] );
	}
	WP_CLI::log( sprintf( '%s: %d match(es)', (string) $op['match'], $sgs_pba_hits[ $i ] ) );
}
if ( $sgs_pba_bad ) {
	WP_CLI::error( 'Nothing written. ' . implode( '; ', $sgs_pba_bad ) );
}
if ( $sgs_pba_undeclared ) {
	WP_CLI::error( 'Nothing written (dry run included). Refused undeclared setting(s): ' . implode( '; ', array_unique( $sgs_pba_undeclared ) ) );
}

$sgs_pba_content = serialize_blocks( $sgs_pba_new );
if ( $sgs_pba_dry ) {
	WP_CLI::success( sprintf( 'Dry run: %d operation(s) would apply; content %d -> %d bytes.', count( $sgs_pba_ops ), strlen( $sgs_pba_post->post_content ), strlen( $sgs_pba_content ) ) );
	return;
}

$sgs_pba_dir = rtrim( ABSPATH, '/' ) . '-backups';
if ( ! is_dir( $sgs_pba_dir ) && ! wp_mkdir_p( $sgs_pba_dir ) ) {
	WP_CLI::error( 'Cannot create the backup folder ' . $sgs_pba_dir );
}
$sgs_pba_backup = sprintf( '%s/%d-%s-%s.html', $sgs_pba_dir, $sgs_pba_post_id, gmdate( 'Ymd-His' ), substr( (string) microtime(), 2, 6 ) );
if ( false === file_put_contents( $sgs_pba_backup, $sgs_pba_post->post_content ) ) {
	WP_CLI::error( 'Backup failed; nothing written.' );
}

$sgs_pba_result = wp_update_post(
	wp_slash(
		array(
			'ID'           => $sgs_pba_post_id,
			'post_content' => $sgs_pba_content,
		)
	),
	true
);
if ( is_wp_error( $sgs_pba_result ) ) {
	WP_CLI::error( 'Update failed: ' . $sgs_pba_result->get_error_message() . ' (backup ' . $sgs_pba_backup . ')' );
}
WP_CLI::success( sprintf( 'Post %d patched (%d operation(s)); backup %s', $sgs_pba_post_id, count( $sgs_pba_ops ), $sgs_pba_backup ) );
