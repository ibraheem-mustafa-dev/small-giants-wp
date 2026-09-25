<?php
/**
 * Shared RRP reader: the "Save £X" / "Save X%" text and the formatted RRP for a
 * product, from a site-configurable post-meta key.
 *
 * Used by sgs/buybox (the saving pill) and sgs/product-card (the saving badge
 * and the struck-through RRP beside the price). The RRP lives in whatever
 * meta key the site's catalogue import fills (block setting `rrpMetaKey`),
 * never a hardcoded client key.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_rrp_saving' ) ) {
	/**
	 * Build the saving text and the formatted RRP for one product.
	 *
	 * Hidden unless the meta key is set, holds a number, and the RRP is above
	 * the current price (only a genuine saving is shown).
	 *
	 * @param int    $post_id             The product's post ID.
	 * @param string $meta_key            Raw (unsanitised) meta-key setting value.
	 * @param int    $current_price_minor The current price in minor units (pence).
	 * @param int    $decimals            Currency decimal places.
	 * @param string $format              'amount' or 'percentage'.
	 * @return array{hidden: bool, text: string, rrp_display: string}
	 */
	function sgs_product_rrp_saving( int $post_id, string $meta_key, int $current_price_minor, int $decimals, string $format ): array {
		$hidden_result = array(
			'hidden'      => true,
			'text'        => '',
			'rrp_display' => '',
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

		if ( $rrp_minor <= $current_price_minor ) {
			return $hidden_result;
		}

		$format_money = static function ( int $minor ) use ( $decimals ): string {
			$major = $minor / ( 10 ** $decimals );
			return function_exists( 'wc_price' )
				? wp_strip_all_tags( wc_price( $major ) )
				: number_format( $major, $decimals );
		};

		$saving_minor = $rrp_minor - $current_price_minor;

		if ( 'percentage' === $format ) {
			$pct = (int) round( ( $saving_minor / $rrp_minor ) * 100 );
			/* translators: %d is the percentage saved off the RRP, e.g. "Save 19%". */
			$text = sprintf( __( 'Save %d%%', 'sgs-blocks' ), $pct );
		} else {
			/* translators: %s is the formatted money amount saved off the RRP, e.g. "Save £32". */
			$text = sprintf( __( 'Save %s', 'sgs-blocks' ), $format_money( $saving_minor ) );
		}

		return array(
			'hidden'      => false,
			'text'        => $text,
			'rrp_display' => $format_money( $rrp_minor ),
		);
	}
}
