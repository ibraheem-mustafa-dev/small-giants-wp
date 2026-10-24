<?php
/**
 * Per-instance `flex-wrap` rules for a block's rows of items.
 *
 * Every block that lays items in a row declares a wrap attribute (string, enum
 * `["", "nowrap", "wrap"]`, default empty) and maps it with `css:flex-wrap` in
 * `supports.sgs.elements` (`scripts/check-row-flex-wrap.py` holds them to it). Empty keeps the
 * stylesheet's own wrapping, so only `nowrap` and `wrap` emit a rule.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_flex_wrap_css' ) ) {
	/**
	 * Build the `flex-wrap` rules for the rows a block has a wrap setting for.
	 *
	 * @param array<string,mixed>  $attributes Block attributes.
	 * @param string               $root_sel   The block's own scoped root selector.
	 * @param array<string,string> $map        Attribute name => selector of the row (a comma list is allowed),
	 *                                         relative to the root.
	 * @return string CSS text (may be '').
	 */
	function sgs_flex_wrap_css( array $attributes, string $root_sel, array $map ): string {
		$css = '';
		foreach ( $map as $attr => $selector ) {
			$value = (string) ( $attributes[ $attr ] ?? '' );
			if ( ! in_array( $value, array( 'nowrap', 'wrap' ), true ) ) {
				continue;
			}
			$selectors = array();
			foreach ( explode( ',', $selector ) as $part ) {
				$selectors[] = $root_sel . ' ' . trim( $part );
			}
			$css .= implode( ',', $selectors ) . '{flex-wrap:' . $value . ';}';
		}
		return $css;
	}
}
