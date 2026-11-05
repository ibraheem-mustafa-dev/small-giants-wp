<?php
/**
 * Gift order on a single-product page (Spec 27, FR-30-21).
 *
 * Outside WooCommerce's Cart and Checkout blocks nothing mounts the React component, so the block prints its own
 * markup here and `view.js` wires it to the same `POST /sgs/v1/cart/gift` route and the same session value. The
 * shopper ticks the box (and may write a note) beside the add to basket button; the basket and checkout then show it
 * already ticked. The recipient name is asked where it is needed, in the basket and the checkout step, and is kept
 * as it is when the product page saves.
 *
 * @package SGS\Blocks\Gift_Order
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_gift_order_is_product_page' ) ) {
	/**
	 * Whether the block is being drawn on a single-product page.
	 *
	 * @return bool
	 */
	function sgs_gift_order_is_product_page(): bool {
		return function_exists( 'is_product' ) && is_product();
	}
}

if ( ! function_exists( 'sgs_gift_order_count_text' ) ) {
	/**
	 * The character count line: %1$d characters used, %2$d the maximum, %3$d the characters left.
	 *
	 * @param string $format Block text.
	 * @param int    $used   Characters used.
	 * @param int    $max    Characters allowed.
	 * @return string
	 */
	function sgs_gift_order_count_text( string $format, int $used, int $max ): string {
		$values = array(
			1 => $used,
			2 => $max,
			3 => max( 0, $max - $used ),
		);
		return (string) preg_replace_callback(
			'/%([123])\$d/',
			static fn( array $match ): string => (string) $values[ (int) $match[1] ],
			$format
		);
	}
}

if ( ! function_exists( 'sgs_gift_order_product_html' ) ) {
	/**
	 * The product-page markup.
	 *
	 * @param array $attributes Block attributes.
	 * @param array $config     The block's settings (the `data-config` value, already limited by the shop caps).
	 * @param array $value      The stored gift value: on, to, message.
	 * @return string HTML.
	 */
	function sgs_gift_order_product_html( array $attributes, array $config, array $value ): string {
		$id      = 'sgs-gift-order-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$limit   = (int) $config['messageLimit'];
		$message = mb_substr( (string) $value['message'], 0, $limit );
		$config  = array_merge(
			$config,
			array(
				'restUrl'  => esc_url_raw( rest_url( 'sgs/v1/cart/gift' ) ),
				'storeUrl' => esc_url_raw( rest_url( 'wc/store/v1/cart' ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'to'       => (string) $value['to'],
			)
		);

		$wrapper = get_block_wrapper_attributes(
			array(
				'class'       => 'sgs-gift-order sgs-gift-order--product',
				'data-config' => (string) wp_json_encode( $config ),
			)
		);

		$html  = '<div ' . $wrapper . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes each value.
		$html .= '<label class="sgs-gift-order__switch" for="' . esc_attr( $id . '-switch' ) . '">';
		$html .= '<input id="' . esc_attr( $id . '-switch' ) . '" class="sgs-gift-order__checkbox" type="checkbox"' . checked( ! empty( $value['on'] ), true, false ) . ' />';
		$html .= '<span class="sgs-gift-order__switch-label"><span class="sgs-gift-order__switch-text">' . esc_html( (string) $config['basketLabel'] ) . '</span>';
		if ( '' !== (string) $config['basketHelp'] ) {
			$html .= '<span class="sgs-gift-order__help">' . esc_html( (string) $config['basketHelp'] ) . '</span>';
		}
		$html .= '</span></label>';
		$html .= '<div class="sgs-gift-order__fields"' . ( empty( $value['on'] ) ? ' hidden' : '' ) . '>';
		$html .= '<div class="sgs-gift-order__field">';
		$html .= '<label class="sgs-gift-order__label sgs-gift-order__label--hidden" for="' . esc_attr( $id . '-message' ) . '">' . esc_html( (string) $config['messageLabel'] ) . '</label>';
		$html .= '<textarea id="' . esc_attr( $id . '-message' ) . '" class="sgs-gift-order__textarea" rows="3" maxlength="' . esc_attr( (string) $limit ) . '" placeholder="' . esc_attr( (string) $config['messagePlaceholder'] ) . '">' . esc_textarea( $message ) . '</textarea>';
		$html .= '<span class="sgs-gift-order__count" aria-live="polite">' . esc_html( sgs_gift_order_count_text( (string) $config['characterCountText'], mb_strlen( $message ), $limit ) ) . '</span>';
		$html .= '</div></div>';
		$html .= '<p class="sgs-gift-order__error" role="alert" hidden></p>';
		$html .= '</div>';
		return $html;
	}
}
