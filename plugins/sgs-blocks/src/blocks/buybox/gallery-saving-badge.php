<?php
/**
 * Sgs/buybox — saving-amount-only reader for the gallery's main-photo badge
 *
 * Deliberately does NOT call includes/product-rrp.php's
 * sgs_product_rrp_saving() — that helper always prefixes its returned `text`
 * with a translated "Save"/custom prefix word (rrpSavingPrefix), with no way
 * to ask for the bare amount alone, and it is a shared file this task's scope
 * does not touch. This is the SAME saving-detection rule (RRP meta numeric,
 * above the current price) reproduced minimally for the one extra value the
 * badge needs, not a second colour/RRP mechanism — the pill's own visibility
 * still comes from sgs_product_rrp_saving() via $buybox_rrp in render.php.
 *
 * Data prep + one HTML builder, no CSS — the badge's look (background/text
 * colour/position) is emitted from render.php's own scoped CSS.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_saving_amount' ) ) {
	/**
	 * The formatted saving amount alone (e.g. "£51"), '' when there is no
	 * genuine saving — mirrors sgs_product_rrp_saving()'s own hidden/shown
	 * rule (meta key set, numeric, RRP above the current price) so the badge
	 * and the existing saving pill always agree on whether a saving exists.
	 *
	 * @param int    $post_id             The product's post ID.
	 * @param string $meta_key            Raw (unsanitised) meta-key setting value.
	 * @param int    $current_price_minor The current price in minor units (pence).
	 * @param int    $decimals            Currency decimal places.
	 * @return string Formatted saving amount, or '' when there is none.
	 */
	function sgs_buybox_saving_amount( int $post_id, string $meta_key, int $current_price_minor, int $decimals ): string {
		$meta_key = sanitize_key( $meta_key );
		if ( '' === $meta_key || $post_id <= 0 || $current_price_minor <= 0 ) {
			return '';
		}

		$rrp_raw = get_post_meta( $post_id, $meta_key, true );
		if ( ! is_numeric( $rrp_raw ) ) {
			return '';
		}

		$decimals  = max( 0, $decimals );
		$rrp_minor = (int) round( ( (float) $rrp_raw ) * ( 10 ** $decimals ) );
		if ( $rrp_minor <= $current_price_minor ) {
			return '';
		}

		$saving_minor = $rrp_minor - $current_price_minor;
		$saving_major = $saving_minor / ( 10 ** $decimals );

		return function_exists( 'wc_price' )
			? wp_strip_all_tags( wc_price( $saving_major ) )
			: number_format( $saving_major, $decimals );
	}
}

if ( ! function_exists( 'sgs_buybox_saving_badge_text' ) ) {
	/**
	 * Fill the {amount} token in the badge's format string.
	 *
	 * @param string $format Raw gallerySavingBadgeFormat attribute value.
	 * @param string $amount Formatted saving amount (already computed non-empty).
	 * @return string The badge's display text.
	 */
	function sgs_buybox_saving_badge_text( string $format, string $amount ): string {
		$format = sanitize_text_field( $format );
		if ( '' === $format || false === strpos( $format, '{amount}' ) ) {
			/* translators: %s is the formatted saving amount, e.g. "£51". */
			$format = __( 'Save {amount} off RRP', 'sgs-blocks' );
		}
		return str_replace( '{amount}', $amount, $format );
	}
}
