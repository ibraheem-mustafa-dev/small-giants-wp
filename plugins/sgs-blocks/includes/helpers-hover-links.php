<?php
/**
 * Hover colour for links inside a block's wrapper.
 *
 * A block paints its hover colour on its wrapper (`{sel}:hover{color:X}`). A link
 * inside that wrapper does not follow it on hover: theme.json's generated
 * `:root :where(a:where(:not(.wp-element-button)):hover)` rule (0,1,0, loaded after
 * the block's own CSS) matches the anchor directly and beats a block-level
 * `.x__link{color:inherit}`. This helper emits the rule that makes the anchor
 * inherit the wrapper's hover colour, at a higher specificity than that global rule.
 *
 * Only emitted by a caller that has a hover colour to hand down, so links in a
 * block with no hover setting keep the theme's link hover colour.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';

if ( ! function_exists( 'sgs_hover_link_inherit_css' ) ) {
	/**
	 * Make links inside `$selector` inherit its hover colour.
	 *
	 * Hover is wrapped in both touch guards (same as every other hover rule);
	 * `:focus-visible` stays outside them so keyboard users keep the state.
	 *
	 * @param string $selector The wrapper selector the block paints its hover colour on.
	 * @return string CSS, or '' when the selector is empty.
	 */
	function sgs_hover_link_inherit_css( string $selector ): string {
		$selector = trim( $selector );
		if ( '' === $selector ) {
			return '';
		}

		return sgs_hover_media_wrap(
			SGS_HOVER_NOT_TOUCH . ' ' . $selector . ' a:not(.wp-element-button):hover{color:inherit}'
		) . $selector . ' a:not(.wp-element-button):focus-visible{color:inherit}';
	}
}
