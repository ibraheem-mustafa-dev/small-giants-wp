<?php
/**
 * Sgs/buybox — Wave B framework extensions.
 *
 * Kept OUT of render.php (already well over the 300-line file cap; rule is
 * not to grow it further) — every function here is called from render.php,
 * which stays the single source of the render sequence and wrapper markup.
 *
 * The RRP pill's text comes from the shared includes/product-rrp.php.
 *
 * All three features are deliberately SSR-only, mirroring this block's own
 * existing "SSR-only — no data-wp-* on ladder nodes" pattern (see render.php's
 * comparative value-ladder, FR-30-8): the sticky offset is per-instance
 * static, and the RRP pill + stock-status label both read the DEFAULT
 * variation only. Neither updates if the shopper swaps to a different
 * option-picker combination — doing that live would mean writing new
 * client-side logic into the SHARED `sgs/product-card` Interactivity store
 * (plugins/sgs-blocks/src/blocks/product-card/view.js), which is outside
 * this task's file scope (buybox/ only). Flagged explicitly in the task
 * report; not a silent gap.
 *
 * Guarded with function_exists() throughout (render.php::render, this
 * block's render.php doc-comment, and the project-wide no-top-level-function
 * rule) — a PHP file included by a block's render callback runs once per
 * rendered instance of THAT block, so redeclaration must be defended even
 * though only one buybox typically renders per product page.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_sticky_data' ) ) {
	/**
	 * Resolve the sticky-column setting into a clean {enabled, offset} pair.
	 *
	 * Offset is a free CSS length string (Spec 32 S7) — sanitised through the
	 * shared length sanitiser, never a bare cast-to-number, so the operator can
	 * use px/rem/em/% exactly like every other SGS length control.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{enabled: bool, offset: string} offset is a sanitised CSS length or ''.
	 */
	function sgs_buybox_sticky_data( array $attributes ): array {
		$enabled = (bool) ( $attributes['stickyEnabled'] ?? false );
		$offset  = sgs_css_length_value( $attributes['stickyOffset'] ?? '' );

		return array(
			'enabled' => $enabled,
			'offset'  => $offset,
		);
	}
}

if ( ! function_exists( 'sgs_buybox_stock_status' ) ) {
	/**
	 * Resolve the in-stock / low-stock / out-of-stock status for the DEFAULT
	 * variation. Low-stock reads WooCommerce's own per-variation stock
	 * management (falling back to the site's global low-stock notification
	 * threshold) — never a fabricated or hardcoded quantity.
	 *
	 * @param int    $variation_id       The default combo's variation product ID.
	 * @param bool   $in_stock           The default combo's in-stock flag (manifest).
	 * @param string $fallback_text      The manifest's own out-of-stock text (e.g. "Out of stock"
	 *                                   or the JS store's "Unavailable" — see product-card/view.js).
	 * @param string $custom_in_stock_label Optional (Eye Care Wave C, stockInStockLabel). Replaces
	 *                                   the IN-STOCK label only when non-empty — low-stock and
	 *                                   out-of-stock wording are untouched by this parameter.
	 * @return array{class: string, label: string}
	 */
	function sgs_buybox_stock_status( int $variation_id, bool $in_stock, string $fallback_text, string $custom_in_stock_label = '' ): array {
		if ( ! $in_stock ) {
			return array(
				'class' => 'buybox__stock--out-of-stock',
				'label' => '' !== $fallback_text ? $fallback_text : __( 'Out of stock', 'sgs-blocks' ),
			);
		}

		$is_low = false;

		if ( $variation_id > 0 && class_exists( 'WooCommerce' ) && function_exists( 'wc_get_product' ) ) {
			$variation = wc_get_product( $variation_id );
			if ( $variation instanceof \WC_Product_Variation && $variation->managing_stock() ) {
				$quantity   = $variation->get_stock_quantity();
				$low_amount = $variation->get_low_stock_amount();
				if ( '' === $low_amount || null === $low_amount ) {
					$low_amount = absint( get_option( 'woocommerce_notify_low_stock_amount', 2 ) );
				}
				if ( null !== $quantity && $quantity > 0 && $quantity <= (int) $low_amount ) {
					$is_low = true;
				}
			}
		}

		if ( $is_low ) {
			return array(
				'class' => 'buybox__stock--low-stock',
				'label' => __( 'Low stock', 'sgs-blocks' ),
			);
		}

		return array(
			'class' => 'buybox__stock--in-stock',
			'label' => '' !== $custom_in_stock_label ? $custom_in_stock_label : __( 'In stock', 'sgs-blocks' ),
		);
	}
}

if ( ! function_exists( 'sgs_buybox_axis_has_swatch' ) ) {
	/**
	 * Whether any of an axis's terms carry a colour or image swatch (term meta
	 * `_sgs_swatch_color` / `_sgs_swatch_image_id`) — mirrors option-picker/
	 * render.php's own swatch_map lookup (§8, FR-27-B2). Used here ONLY to
	 * decide which of the two picker-style overrides (pickerSwatchStyle vs
	 * pickerStyle) a given axis receives; option-picker's own render.php still
	 * does the authoritative per-term lookup that actually paints the swatch.
	 *
	 * @param string $taxonomy The axis's WooCommerce attribute taxonomy.
	 * @param array  $terms    The axis's terms, each {slug, label, ...} (manifest shape).
	 * @return bool True when at least one term has a swatch colour or image.
	 */
	function sgs_buybox_axis_has_swatch( string $taxonomy, array $terms ): bool {
		if ( '' === $taxonomy || ! taxonomy_exists( $taxonomy ) ) {
			return false;
		}

		foreach ( $terms as $term_row ) {
			$slug = (string) ( $term_row['slug'] ?? '' );
			if ( '' === $slug ) {
				continue;
			}

			$term = get_term_by( 'slug', $slug, $taxonomy );
			if ( ! $term instanceof \WP_Term ) {
				continue;
			}

			$colour   = sanitize_hex_color( (string) get_term_meta( $term->term_id, '_sgs_swatch_color', true ) );
			$image_id = absint( get_term_meta( $term->term_id, '_sgs_swatch_image_id', true ) );

			if ( $colour || $image_id > 0 ) {
				return true;
			}
		}

		return false;
	}
}

if ( ! function_exists( 'sgs_buybox_add_to_cart_class' ) ) {
	/**
	 * Allowlist an addToCartStyle value into its BEM modifier class, or '' for
	 * today's look. Mirrors sgs/button's primary/secondary/outline preset
	 * names — style.css's `.buybox__add-to-cart--{style}` rules read the SAME
	 * `--wp--custom--button-presets--{style}--*` design tokens sgs/button's own
	 * `.sgs-button--{style}` rules do (style.css docblock), so the two stay
	 * visually matched without this block depending on sgs/button's stylesheet
	 * being enqueued (buybox/ file-scope contract — this block's own CSS is
	 * self-contained).
	 *
	 * @param string $style Raw addToCartStyle attribute value.
	 * @return string '' or 'primary'|'secondary'|'outline'.
	 */
	function sgs_buybox_add_to_cart_class( string $style ): string {
		$allowed = array( 'primary', 'secondary', 'outline' );
		return in_array( $style, $allowed, true ) ? $style : '';
	}
}

if ( ! function_exists( 'sgs_buybox_extras_scoped_css' ) ) {
	/**
	 * Build the scoped <style> rules for all three Wave B features (Spec 32 —
	 * no inline `style="…"` anywhere; every declaration goes through the
	 * block's own scoped stylesheet, exactly like render.php's existing
	 * margin/colour/border blocks).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's unique root selector (render.php's $root_sel).
	 * @param array  $rrp        Result of sgs_product_rrp_saving() (includes/product-rrp.php).
	 * @param array  $sticky     Result of sgs_buybox_sticky_data().
	 * @return string[] CSS rule strings to append to render.php's $scoped_css.
	 */
	function sgs_buybox_extras_scoped_css( array $attributes, string $root_sel, array $rrp, array $sticky ): array {
		$css = array();

		// --- Sticky configurator column. Disabled below 768px unconditionally
		// (a stuck column fights the shopper's scroll on a phone-width screen —
		// task brief). --sgs-header-height is the theme's own live-published
		// custom property (src/header-behaviours/view.js); falls back to 0px
		// on a page with no sticky header at all. ---
		if ( $sticky['enabled'] ) {
			$offset_len = '' !== $sticky['offset'] ? $sticky['offset'] : '0px';
			$css[]      = '@media(min-width:768px){' . $root_sel . ' .sgs-buybox__config-col{position:sticky;top:calc(var(--sgs-header-height, 0px) + ' . $offset_len . ');}}';
		}

		// --- RRP saving pill colours. ---
		if ( ! $rrp['hidden'] ) {
			$rrp_bg   = sgs_colour_value( (string) ( $attributes['rrpPillBackgroundColour'] ?? '' ) );
			$rrp_text = sgs_colour_value( (string) ( $attributes['rrpPillTextColour'] ?? '' ) );
			$decls    = array();
			if ( '' !== $rrp_bg ) {
				$decls[] = 'background-color:' . $rrp_bg . ';';
			}
			if ( '' !== $rrp_text ) {
				$decls[] = 'color:' . $rrp_text . ';';
			}
			if ( ! empty( $decls ) ) {
				$css[] = $root_sel . ' .buybox__rrp-pill{' . implode( '', $decls ) . '}';
			}
		}

		// --- Stock-status colours (dot + label share the same colour). ---
		$stock_colour_map = array(
			'in-stock'     => (string) ( $attributes['stockInStockColour'] ?? '' ),
			'low-stock'    => (string) ( $attributes['stockLowStockColour'] ?? '' ),
			'out-of-stock' => (string) ( $attributes['stockOutOfStockColour'] ?? '' ),
		);
		foreach ( $stock_colour_map as $status_key => $raw_colour ) {
			$resolved = sgs_colour_value( $raw_colour );
			if ( '' === $resolved ) {
				continue;
			}
			$status_sel = $root_sel . ' .buybox__stock--' . $status_key;
			$css[]      = $status_sel . '{color:' . $resolved . ';}' . $status_sel . ' .buybox__stock-dot{background-color:' . $resolved . ';}';
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_buybox_split_extras' ) ) {
	/**
	 * Split the extras slot's rendered child markup into three groups: "before"
	 * (the first N children, shown above the price row), "beforeCart" (the NEXT
	 * M children, shown between the pickers/stock status and the add-to-cart
	 * form — Eye Care Wave C, extrasBeforeCartCount), and "after" (the rest,
	 * shown below the add-to-cart form — today's default position).
	 *
	 * Renders each child individually via WP_Block::render() rather than
	 * slicing render.php's own $content string, since $content is one
	 * concatenated blob with no per-child boundary to cut on.
	 *
	 * @param \WP_Block_List $inner_blocks     The buybox's InnerBlocks children.
	 * @param int            $before_count     How many leading children go in the "before" group (already sanitised non-negative).
	 * @param int            $before_cart_count Optional. How many children AFTER the "before" group go in the
	 *                                          "beforeCart" group (already sanitised non-negative). Default 0 — every
	 *                                          existing caller (and every buybox with extrasBeforeCartCount unset/0)
	 *                                          gets an empty "beforeCart" group, byte-identical to before this param existed.
	 * @return array{before: string, beforeCart: string, after: string}
	 */
	function sgs_buybox_split_extras( \WP_Block_List $inner_blocks, int $before_count, int $before_cart_count = 0 ): array {
		$before      = '';
		$before_cart = '';
		$after       = '';
		$index       = 0;

		foreach ( $inner_blocks as $inner_block ) {
			$markup = $inner_block->render();
			if ( $index < $before_count ) {
				$before .= $markup;
			} elseif ( $index < $before_count + $before_cart_count ) {
				$before_cart .= $markup;
			} else {
				$after .= $markup;
			}
			++$index;
		}

		return array(
			'before'     => $before,
			'beforeCart' => $before_cart,
			'after'      => $after,
		);
	}
}
