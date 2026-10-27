<?php
/**
 * Whether a form holds its own submit button (Spec 04, sgs/form).
 *
 * A form whose blocks include an sgs/button set as a submit button (isSubmit) submits through that button, so
 * sgs/form's render.php leaves out its built-in submit button: two submit buttons would show side by side.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_form_has_own_submit' ) ) {
	/**
	 * Whether any block in a parsed block list, at any depth, is an sgs/button set as a submit button.
	 *
	 * @param array $blocks Parsed blocks ({ blockName, attrs, innerBlocks }), as WP_Block::$parsed_block['innerBlocks'] holds them.
	 * @return bool
	 */
	function sgs_form_has_own_submit( array $blocks ): bool {
		foreach ( $blocks as $parsed ) {
			if ( ! is_array( $parsed ) ) {
				continue;
			}
			if ( 'sgs/button' === ( $parsed['blockName'] ?? '' ) && ! empty( $parsed['attrs']['isSubmit'] ) ) {
				return true;
			}
			if ( ! empty( $parsed['innerBlocks'] ) && is_array( $parsed['innerBlocks'] ) && sgs_form_has_own_submit( $parsed['innerBlocks'] ) ) {
				return true;
			}
		}
		return false;
	}
}
