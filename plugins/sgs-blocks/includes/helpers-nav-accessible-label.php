<?php
/**
 * Whether a menu button's visible label can serve as its accessible name.
 *
 * A label made only of symbols (`×`, `☰`, `→`) is read out as the symbol's name or not at all, so
 * it never names the button: the button keeps its translated name ("Close menu", "Open menu") and
 * the glyph stays as the visible content. A label with at least one letter or digit is a word, and
 * Label in Name (WCAG 2.5.3) makes it the accessible name. Used by sgs/nav-drawer's close button
 * and sgs/nav-bar-menu's trigger.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_label_is_word' ) ) {
	/**
	 * True when the label holds at least one letter or digit.
	 *
	 * @param string $label The operator's label, trimmed.
	 * @return bool
	 */
	function sgs_nav_label_is_word( string $label ): bool {
		return 1 === preg_match( '/[\p{L}\p{N}]/u', $label );
	}
}
