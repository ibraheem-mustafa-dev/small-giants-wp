<?php
/**
 * Shared helper: the content hash a block uses as its per-instance scope class.
 *
 * WordPress fills every block.json default into the attributes a render receives, so hashing the whole array makes
 * the scope class change whenever a new attribute (with a default) is added to the block, even for a saved block
 * that never set it. This hashes only the values that differ from their block.json default, so adding a new
 * setting leaves every existing instance's class unchanged.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_instance_scope_hash' ) ) {
	/**
	 * Hash of the attributes that differ from their block.json default, plus any extra string (such as block context).
	 *
	 * @param array<string,mixed> $attributes Render attributes (defaults applied).
	 * @param object|null         $block      The WP_Block being rendered (its block type carries the defaults).
	 * @param string              $extra      Extra text mixed into the hash (for example the JSON of the block context).
	 * @return string Eight hex characters.
	 */
	function sgs_instance_scope_hash( array $attributes, $block, string $extra = '' ): string {
		$defs = ( is_object( $block ) && isset( $block->block_type->attributes ) && is_array( $block->block_type->attributes ) )
			? $block->block_type->attributes
			: array();
		foreach ( $defs as $name => $def ) {
			if ( is_array( $def ) && array_key_exists( 'default', $def ) && array_key_exists( $name, $attributes ) && $attributes[ $name ] === $def['default'] ) {
				unset( $attributes[ $name ] );
			}
		}
		return substr( md5( wp_json_encode( $attributes ) . $extra ), 0, 8 );
	}
}
