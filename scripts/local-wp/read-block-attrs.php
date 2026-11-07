<?php
/**
 * Lists every block of the given posts that carries a `cr-ref-` class token, with its block name and saved attributes.
 *
 * Run through scripts/local-wp/read-block-attrs.py (it calls `wp eval-file` inside WSL). Read-only.
 * Arguments (from wp eval-file): <out-file.json> <post-id or template:slug> [...]
 * Output: { "<post-id>": { "blocks": { "<ref>": { "block": "sgs/container", "attrs": { ... }, "parent": "<ref of the nearest enclosing block, or null>" } }, "duplicates": [] } }.
 * A ref held by two blocks of a post is listed in `duplicates`, because a patch that matches it would refuse.
 *
 * @package SGS
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}

$sgs_rba_out  = (string) array_shift( $args );
$sgs_rba_all  = array();
$sgs_rba_walk = static function ( array $blocks, array &$found, array &$dupes, ?string $parent = null ) use ( &$sgs_rba_walk ): void {
	foreach ( $blocks as $block ) {
		if ( empty( $block['blockName'] ) ) {
			continue;
		}
		$tokens = preg_split( '/\s+/', (string) ( $block['attrs']['className'] ?? '' ) ) ?: array();
		$own    = null;
		foreach ( $tokens as $token ) {
			if ( 0 === strpos( $token, 'cr-ref-' ) ) {
				if ( isset( $found[ $token ] ) ) {
					$dupes[] = $token;
				}
				$found[ $token ] = array(
					'block'  => $block['blockName'],
					'attrs'  => $block['attrs'],
					'parent' => $parent,
				);
				$own = $own ?? $token;
			}
		}
		$sgs_rba_walk( $block['innerBlocks'] ?? array(), $found, $dupes, $own ?? $parent );
	}
};

foreach ( $args as $sgs_rba_id ) {
	// `template:<slug>` names a saved block template: a posts page renders through `home`, not through its own page.
	if ( 0 === strpos( $sgs_rba_id, 'template:' ) ) {
		$sgs_rba_found = get_posts(
			array(
				'post_type'   => 'wp_template',
				'post_status' => 'any',
				'name'        => substr( $sgs_rba_id, 9 ),
				'numberposts' => 1,
				'fields'      => 'ids',
			)
		);
		$sgs_rba_all['templates'][ substr( $sgs_rba_id, 9 ) ] = $sgs_rba_found ? (int) $sgs_rba_found[0] : 0;
		$sgs_rba_id = $sgs_rba_found ? (string) $sgs_rba_found[0] : '0';
	}
	$sgs_rba_post   = get_post( (int) $sgs_rba_id );
	$sgs_rba_blocks = array();
	$sgs_rba_dupes  = array();
	if ( $sgs_rba_post ) {
		$sgs_rba_walk( parse_blocks( $sgs_rba_post->post_content ), $sgs_rba_blocks, $sgs_rba_dupes );
	}
	$sgs_rba_all[ (string) $sgs_rba_id ] = array(
		'blocks'     => (object) $sgs_rba_blocks,
		'duplicates' => array_values( array_unique( $sgs_rba_dupes ) ),
	);
}
file_put_contents( $sgs_rba_out, wp_json_encode( $sgs_rba_all, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
WP_CLI::success( 'read ' . count( $sgs_rba_all ) . ' posts' );
