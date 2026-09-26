<?php
/**
 * Product card (sgs/product-card): scoped CSS for the card parts that have their own
 * inspector controls outside the shared typography and colour emitters —
 * the hover border colour, the RRP colour, and the colour dots' size and
 * hover growth.
 *
 * Kept out of the block's render.php (over the PHP file-length limit); the
 * render appends this function's result to its one scoped <style> rule.
 * Loaded via require_once, so the function is declared once however many
 * cards the page renders.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_parts_css' ) ) {
	/**
	 * Build the card-part rules for one card instance.
	 *
	 * @param string $root_sel   The instance's root selector (".{uid}.wp-block-sgs-product-card").
	 * @param array  $attributes Block attributes.
	 * @return string CSS, or '' when nothing is set.
	 */
	function sgs_product_card_parts_css( string $root_sel, array $attributes ): string {
		$css = '';

		// Hover border colour: a touch-guarded rule on the card root, one
		// specificity step above the resting border-color rule.
		$border_hover = (string) ( $attributes['borderColourHover'] ?? '' );
		if ( '' !== $border_hover ) {
			$css .= sgs_hover_state_rules(
				$root_sel,
				'border-color:' . sgs_colour_value( $border_hover ) . ';',
				':focus-within'
			);
		}

		$rrp_colour = (string) ( $attributes['rrpColour'] ?? '' );
		if ( '' !== $rrp_colour ) {
			$css .= $root_sel . ' .sgs-product-card__rrp{color:' . sgs_colour_value( $rrp_colour ) . ';}';
		}

		$swatch_size = min( 40, absint( $attributes['swatchSize'] ?? 0 ) );
		if ( $swatch_size > 0 ) {
			// Read by style.css's `.sgs-product-card__swatch` width and height.
			$css .= $root_sel . '{--sgs-pc-swatch-size:' . $swatch_size . 'px;}';
		}

		// Read by style.css's `.sgs-product-card__swatch:hover` transform.
		$swatch_hover = min( 200, absint( $attributes['swatchHoverGrow'] ?? 0 ) );
		if ( $swatch_hover > 100 ) {
			$css .= $root_sel . '{--sgs-pc-swatch-hover-scale:' . number_format( $swatch_hover / 100, 2 ) . ';}';
		}

		return $css;
	}
}
