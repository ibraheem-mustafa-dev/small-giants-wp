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
	 * @param string $prefix              Optional. The words before the amount/percentage
	 *                                    (e.g. "Save", "You save"). '' (default) falls back
	 *                                    to the translated "Save" — every existing caller
	 *                                    that doesn't pass this keeps its exact prior text.
	 * @return array{hidden: bool, text: string, rrp_display: string}
	 */
	function sgs_product_rrp_saving( int $post_id, string $meta_key, int $current_price_minor, int $decimals, string $format, string $prefix = '' ): array {
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

		$saving_minor     = $rrp_minor - $current_price_minor;
		$prefix_sanitised = '' !== trim( $prefix ) ? sanitize_text_field( $prefix ) : __( 'Save', 'sgs-blocks' );

		/**
		 * Whether a whole-pound saving drops its ".00" ("Save £32", not
		 * "Save £32.00"). Only the saving amount: prices and the RRP always
		 * show their pennies. The theme's Shop setting switches it on.
		 *
		 * @param bool $trim Default false.
		 */
		$trim_saving = (bool) apply_filters( 'sgs_saving_trim_zeros', false );
		$saving_text = ( $trim_saving && 0 === $saving_minor % ( 10 ** $decimals ) && function_exists( 'wc_price' ) )
			? wp_strip_all_tags( wc_price( $saving_minor / ( 10 ** $decimals ), array( 'decimals' => 0 ) ) )
			: $format_money( $saving_minor );

		if ( 'percentage' === $format ) {
			$pct = (int) round( ( $saving_minor / $rrp_minor ) * 100 );
			/* translators: 1: saving-prefix words (e.g. "Save"), 2: the percentage saved off the RRP. */
			$text = sprintf( __( '%1$s %2$d%%', 'sgs-blocks' ), $prefix_sanitised, $pct );
		} else {
			/* translators: 1: saving-prefix words (e.g. "Save"), 2: the formatted money amount saved off the RRP. */
			$text = sprintf( __( '%1$s %2$s', 'sgs-blocks' ), $prefix_sanitised, $saving_text );
		}

		return array(
			'hidden'      => false,
			'text'        => $text,
			'rrp_display' => $format_money( $rrp_minor ),
		);
	}
}
