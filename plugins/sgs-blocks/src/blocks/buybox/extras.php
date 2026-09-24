<?php
/**
 * Sgs/buybox — Wave B framework extensions.
 *
 * Kept OUT of render.php (already well over the 300-line file cap; rule is
 * not to grow it further) — every function here is called from render.php,
 * which stays the single source of the render sequence and wrapper markup.
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

if ( ! function_exists( 'sgs_buybox_rrp_pill' ) ) {
	/**
	 * Build the "Save £X" / "Save X%" pill text for the DEFAULT variation.
	 *
	 * The RRP lives in a block-configurable post-meta key (never a hardcoded
	 * client key — R-31-1 / any-client test) so every SGS site can point it
	 * at whatever field its own catalogue import already populates.
	 *
	 * @param int    $post_id              The product's post ID.
	 * @param string $meta_key             Raw (unsanitised) meta-key attribute value.
	 * @param int    $current_price_minor  The default combo's current price, in minor units (pence).
	 * @param int    $decimals             Currency decimal places (from the manifest).
	 * @param string $format               'amount' or 'percentage'.
	 * @return array{hidden: bool, text: string}
	 */
	function sgs_buybox_rrp_pill( int $post_id, string $meta_key, int $current_price_minor, int $decimals, string $format ): array {
		$hidden_result = array(
			'hidden' => true,
			'text'   => '',
		);

		$meta_key = sanitize_key( $meta_key );
		if ( '' === $meta_key || $post_id <= 0 || $current_price_minor <= 0 ) {
			return $hidden_result;
		}

		$rrp_raw = get_post_meta( $post_id, $meta_key, true );
		if ( ! is_numeric( $rrp_raw ) ) {
			return $hidden_result;
		}

		$decimals  = max( 0, $decimals );
		$rrp_minor = (int) round( ( (float) $rrp_raw ) * ( 10 ** $decimals ) );

		// Only show a saving that is genuinely a saving.
		if ( $rrp_minor <= $current_price_minor ) {
			return $hidden_result;
		}

		$saving_minor = $rrp_minor - $current_price_minor;

		if ( 'percentage' === $format ) {
			$pct = (int) round( ( $saving_minor / $rrp_minor ) * 100 );
			return array(
				'hidden' => false,
				/* translators: %d is the percentage saved off the RRP, e.g. "Save 19%". */
				'text'   => sprintf( __( 'Save %d%%', 'sgs-blocks' ), $pct ),
			);
		}

		$saving_major   = $saving_minor / ( 10 ** $decimals );
		$amount_display = function_exists( 'wc_price' )
			? wp_strip_all_tags( wc_price( $saving_major ) )
			: number_format( $saving_major, $decimals );

		return array(
			'hidden' => false,
			/* translators: %s is the formatted money amount saved off the RRP, e.g. "Save £32". */
			'text'   => sprintf( __( 'Save %s', 'sgs-blocks' ), $amount_display ),
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
	 * @param int    $variation_id  The default combo's variation product ID.
	 * @param bool   $in_stock      The default combo's in-stock flag (manifest).
	 * @param string $fallback_text The manifest's own out-of-stock text (e.g. "Out of stock"
	 *                              or the JS store's "Unavailable" — see product-card/view.js).
	 * @return array{class: string, label: string}
	 */
	function sgs_buybox_stock_status( int $variation_id, bool $in_stock, string $fallback_text ): array {
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
			'label' => __( 'In stock', 'sgs-blocks' ),
		);
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
	 * @param array  $rrp        Result of sgs_buybox_rrp_pill().
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
