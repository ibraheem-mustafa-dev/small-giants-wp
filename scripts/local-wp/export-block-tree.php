<?php
/**
 * Prints a post's blocks as a scripts/wp-build-page.js tree (an array of { name, attributes, innerBlocks }), so a
 * hand edit starts from what the post holds today.
 *
 * Usage: wp eval-file export-block-tree.php <post-id> > tree.json
 *
 * Classic (null-named) whitespace blocks are dropped; every attribute stored in the block comment is kept as is.
 *
 * @package SGS
 */

$sgs_tree_post_id = isset( $args[0] ) ? absint( $args[0] ) : 0;
$sgs_tree_post    = $sgs_tree_post_id ? get_post( $sgs_tree_post_id ) : null;
if ( ! $sgs_tree_post ) {
	WP_CLI::error( 'Usage: wp eval-file export-block-tree.php <post-id>' );
}

$sgs_tree_map = static function ( array $blocks ) use ( &$sgs_tree_map ): array {
	$out = array();
	foreach ( $blocks as $block ) {
		if ( empty( $block['blockName'] ) ) {
			continue;
		}
		$node = array(
			'name'       => $block['blockName'],
			'attributes' => (object) ( $block['attrs'] ?? array() ),
		);
		if ( ! empty( $block['innerBlocks'] ) ) {
			$node['innerBlocks'] = $sgs_tree_map( $block['innerBlocks'] );
		}
		$out[] = $node;
	}
	return $out;
};

echo wp_json_encode( $sgs_tree_map( parse_blocks( $sgs_tree_post->post_content ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ), "\n";
