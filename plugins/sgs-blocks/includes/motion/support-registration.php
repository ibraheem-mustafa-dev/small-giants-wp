<?php
/**
 * Motion support registration, the PHP twin of `src/blocks/extensions/motion/register.js` (Spec 38A, FR-38A-1).
 *
 * A block whose registered arguments carry `supports.sgs.motion` (from its block.json) receives the `sgsMotion`
 * object attribute, so the block-renderer REST route and ServerSideRender validate it. The attribute has no default
 * and is not part of saved markup. The generated extension attribute list never carries it
 * (`scripts/generate-extension-attributes.js` excludes it by name).
 *
 * The `sgs_motion_support_enabled` filter (default true) switches the support off on both sides from one place. When
 * it returns false this filter removes `supports.sgs.motion` from the block's registered arguments and adds no
 * attribute. SGS blocks register in the editor with only an icon, an edit and a save component, so the editor takes
 * `supports` from the server-registered block definition (WordPress bootstraps those into the block store), and the
 * JS filter, which acts only on `supports.sgs.motion`, finds nothing to act on.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Add the motion attribute to a block that declares the support, or strip the support when it is switched off.
 *
 * @param array  $args       Registered block type arguments.
 * @param string $block_name Block name.
 * @return array
 */
function sgs_motion_register_block_type_args( $args, $block_name ) {
	unset( $block_name );
	if ( ! is_array( $args ) || empty( $args['supports']['sgs']['motion'] ) ) {
		return $args;
	}

	if ( true !== apply_filters( 'sgs_motion_support_enabled', true ) ) {
		unset( $args['supports']['sgs']['motion'] );
		return $args;
	}

	$attributes              = isset( $args['attributes'] ) && is_array( $args['attributes'] ) ? $args['attributes'] : array();
	$attributes['sgsMotion'] = array( 'type' => 'object' );
	$args['attributes']      = $attributes;
	return $args;
}
add_filter( 'register_block_type_args', __NAMESPACE__ . '\sgs_motion_register_block_type_args', 10, 2 );
