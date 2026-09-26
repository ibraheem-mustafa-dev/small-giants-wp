<?php
/**
 * Sgs/wishlist-panel — scoped colour CSS for the FR-30-14/15 elements
 * (price-drop text, stock chip, guest/alerts bar, share field).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_wishlist_panel_new_element_css' ) ) {
	/**
	 * Build the scoped `<style>` rules for the block's new visible elements.
	 *
	 * @param string $root_sel   The block's root CSS selector.
	 * @param array  $attributes Block attributes.
	 * @return array Scoped CSS rule strings (some may be '').
	 */
	function sgs_wishlist_panel_new_element_css( $root_sel, $attributes ) {
		$css = array();

		$css[] = sgs_text_states_css(
			$root_sel . ' .sgs-wishlist-panel__row-price-drop',
			$attributes,
			array( 'base' => 'priceDropColour' )
		);

		$css[] = sgs_fill_states_css(
			$root_sel . ' .sgs-wishlist-panel__row-stock',
			$attributes,
			array( 'base' => 'stockChipBackgroundColour' )
		);
		$css[] = sgs_text_states_css(
			$root_sel . ' .sgs-wishlist-panel__row-stock',
			$attributes,
			array( 'base' => 'stockChipTextColour' )
		);

		$css[] = sgs_fill_states_css(
			$root_sel . ' .sgs-wishlist-panel__bar, ' . $root_sel . ' .sgs-wishlist-panel__guest-prompt',
			$attributes,
			array( 'base' => 'barBackgroundColour' )
		);

		$css[] = sgs_fill_states_css(
			$root_sel . ' .sgs-wishlist-panel__share-field',
			$attributes,
			array( 'base' => 'shareFieldBackgroundColour' )
		);
		$css[] = sgs_text_states_css(
			$root_sel . ' .sgs-wishlist-panel__share-field',
			$attributes,
			array( 'base' => 'shareFieldTextColour' )
		);

		return $css;
	}
}
