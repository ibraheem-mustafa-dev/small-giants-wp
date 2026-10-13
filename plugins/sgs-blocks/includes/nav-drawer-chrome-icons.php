<?php
/**
 * Nav drawer top-row icons (Spec 36 FR-36-6, `chromeSlotType` `icons`): the
 * free slot holds an `sgs/social-icons` group, so phone, email and social
 * icons come from Site Info through each icon's own `linkSource` and are
 * styled by the group's own controls.
 *
 * The group is a real block: the FIRST block of the drawer body, when it is
 * an `sgs/social-icons`, is lifted out of the body into the top row. The
 * block is rendered again on its own (its markup is deterministic, keyed on
 * an md5 of its attributes) and that exact markup is cut from the body's
 * rendered content. When the first block is anything else, or its markup is
 * not found in the body, nothing moves and the body renders as before.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_drawer_chrome_icons_lift' ) ) {
	/**
	 * Lift the body's leading `sgs/social-icons` group into the top row.
	 *
	 * @param array  $attributes Block attributes.
	 * @param mixed  $block      The drawer's WP_Block (its inner blocks are read).
	 * @param string $content    The body's rendered InnerBlocks; the lifted markup is removed from it.
	 * @return string The slot markup for the top row (trusted block output), or ''.
	 */
	function sgs_nav_drawer_chrome_icons_lift( array $attributes, $block, string &$content ): string {
		if ( 'icons' !== ( $attributes['chromeSlotType'] ?? '' ) || ! is_object( $block ) || empty( $block->inner_blocks ) ) {
			return '';
		}

		$first = null;
		foreach ( $block->inner_blocks as $inner ) {
			$first = $inner;
			break;
		}
		if ( ! is_object( $first ) || 'sgs/social-icons' !== ( $first->name ?? '' ) || ! method_exists( $first, 'render' ) ) {
			return '';
		}

		$html = trim( (string) $first->render() );
		$pos  = '' === $html ? false : strpos( $content, $html );
		if ( false === $pos ) {
			return '';
		}
		$content = substr_replace( $content, '', $pos, strlen( $html ) );

		$placement = (string) ( $attributes['chromeSlotPlacement'] ?? 'after-logo' );
		$placement = in_array( $placement, array( 'after-logo', 'center', 'end' ), true ) ? $placement : 'after-logo';
		return '<div class="sgs-nav-drawer__chrome-slot sgs-nav-drawer__chrome-slot--icons sgs-nav-drawer__chrome-slot--at-' . $placement . '">' . $html . '</div>';
	}
}
