<?php
/**
 * Mini-cart drawer additions: the gift box and the empty state (FR-30-17).
 *
 * Pure string builders and one product resolver, loaded by helpers-cart-panel.php. They take resolved values and return
 * escaped markup; the render-order decisions stay in `src/blocks/cart/render.php`. Both additions print nothing until a
 * setting turns them on.
 *
 * The gift box is a view of the one gift value the `sgs/gift-order` block keeps in the WooCommerce session: the view script
 * reads it from the Store API cart (`extensions.sgs_gift`) and writes it through `POST /sgs/v1/cart/gift`, so the drawer, the
 * basket page, the checkout and the order all show the same fact.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_cart_gift_box_html' ) ) {
	/**
	 * The gift box: a tick box, and a name and a note that appear when it is ticked. It starts hidden; the view script shows
	 * it while the basket holds an item and fills it from the session value.
	 *
	 * @param array $args {
	 *     Resolved values.
	 *
	 *     @type string $id            Id prefix for the fields.
	 *     @type string $label         The tick box's label.
	 *     @type string $help          Helper line under the label; '' prints none.
	 *     @type string $to_label      Label of the recipient-name field.
	 *     @type string $message_label Label of the note field.
	 *     @type string $rest_url      The gift route's URL.
	 *     @type string $nonce         The `wp_rest` nonce the route checks.
	 *     @type int    $to_max        Longest recipient name.
	 *     @type int    $message_max   Longest note.
	 * }
	 * @return string Escaped markup.
	 */
	function sgs_cart_gift_box_html( array $args ): string {
		$id   = (string) ( $args['id'] ?? 'sgs-cart' );
		$help = trim( (string) ( $args['help'] ?? '' ) );

		$html  = sprintf(
			'<div class="sgs-cart__panel-gift" data-sgs-cart-gift data-rest-url="%1$s" data-nonce="%2$s" hidden>',
			esc_url( (string) ( $args['rest_url'] ?? '' ) ),
			esc_attr( (string) ( $args['nonce'] ?? '' ) )
		);
		$html .= sprintf( '<label class="sgs-cart__panel-gift-switch" for="%s-gift">', esc_attr( $id ) );
		$html .= sprintf( '<input id="%s-gift" class="sgs-cart__panel-gift-checkbox" type="checkbox" />', esc_attr( $id ) );
		$html .= '<span class="sgs-cart__panel-gift-text"><span class="sgs-cart__panel-gift-label">' . esc_html( wp_strip_all_tags( (string) ( $args['label'] ?? '' ) ) ) . '</span>';
		if ( '' !== $help ) {
			$html .= '<span class="sgs-cart__panel-gift-help">' . esc_html( wp_strip_all_tags( $help ) ) . '</span>';
		}
		$html .= '</span></label>';
		$html .= '<div class="sgs-cart__panel-gift-fields" hidden>';
		$html .= sprintf(
			'<label class="sgs-cart__panel-gift-field-label" for="%1$s-gift-to">%2$s</label><input id="%1$s-gift-to" class="sgs-cart__panel-gift-to" type="text" maxlength="%3$d" autocomplete="off" />',
			esc_attr( $id ),
			esc_html( wp_strip_all_tags( (string) ( $args['to_label'] ?? '' ) ) ),
			max( 1, (int) ( $args['to_max'] ?? 100 ) )
		);
		$html .= sprintf(
			'<label class="sgs-cart__panel-gift-field-label" for="%1$s-gift-message">%2$s</label><textarea id="%1$s-gift-message" class="sgs-cart__panel-gift-message" rows="3" maxlength="%3$d"></textarea>',
			esc_attr( $id ),
			esc_html( wp_strip_all_tags( (string) ( $args['message_label'] ?? '' ) ) ),
			max( 1, (int) ( $args['message_max'] ?? 500 ) )
		);
		$html .= '</div><p class="sgs-cart__panel-gift-error" role="alert" hidden></p></div>';
		return $html;
	}
}

if ( ! function_exists( 'sgs_cart_empty_product' ) ) {
	/**
	 * What the empty state's button does with a chosen product.
	 *
	 * A simple product that can be bought is added by its own id. A variable product is added when all its default options
	 * are set and name a variation that can be bought, by that variation's id and price. Anything else (out of stock, no
	 * defaults, a grouped or external product) gets `add_id` 0, which makes the button a link to the product's page.
	 *
	 * @param object        $product        A WooCommerce product (or anything with the same methods).
	 * @param callable|null $find_variation `( $product, array $attributes ): int` the matching variation id, 0 for none. Default: WooCommerce's data store.
	 * @param callable|null $get_product    `( int $id )` a product by id. Default: wc_get_product().
	 * @return array{id:int,add_id:int,url:string,price:string}
	 */
	function sgs_cart_empty_product( $product, ?callable $find_variation = null, ?callable $get_product = null ): array {
		$out = array(
			'id'     => (int) $product->get_id(),
			'add_id' => 0,
			'url'    => (string) $product->get_permalink(),
			'price'  => (string) $product->get_price(),
		);
		$buyable = static function ( $candidate ): bool {
			return $candidate && $candidate->is_purchasable() && $candidate->is_in_stock();
		};
		$type    = (string) $product->get_type();

		if ( 'simple' === $type ) {
			if ( $buyable( $product ) ) {
				$out['add_id'] = $out['id'];
			}
			return $out;
		}
		if ( 'variable' !== $type ) {
			return $out;
		}

		$defaults = (array) $product->get_default_attributes();
		$chosen   = array();
		foreach ( array_keys( (array) $product->get_variation_attributes() ) as $name ) {
			$key = sanitize_title( (string) $name );
			if ( ! isset( $defaults[ $key ] ) || '' === (string) $defaults[ $key ] ) {
				return $out;
			}
			$chosen[ 'attribute_' . $key ] = (string) $defaults[ $key ];
		}
		if ( ! $chosen ) {
			return $out;
		}
		if ( null === $find_variation ) {
			$find_variation = static function ( $parent, array $attributes ): int {
				return (int) \WC_Data_Store::load( 'product' )->find_matching_product_variation( $parent, $attributes );
			};
		}
		if ( null === $get_product ) {
			$get_product = 'wc_get_product';
		}
		$variation_id = (int) $find_variation( $product, $chosen );
		$variation    = $variation_id > 0 ? $get_product( $variation_id ) : null;
		if ( $buyable( $variation ) ) {
			$out['add_id'] = $variation_id;
			$out['price']  = (string) $variation->get_price();
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_cart_empty_state_html' ) ) {
	/**
	 * The drawer's empty state, centred: an optional picture, the heading, an optional body line, an optional button for one
	 * product and an optional text link. '' when none of the additions is set, so the view script keeps its plain empty
	 * message and button.
	 *
	 * @param array $args {
	 *     Resolved values.
	 *
	 *     @type string     $heading      Heading text (rich text).
	 *     @type string     $body         Body line (rich text); '' prints none.
	 *     @type string     $image_html   The picture's markup from the media renderer; '' prints none.
	 *     @type array|null $product      `sgs_cart_empty_product()` result plus `price_text` (the price as plain text); null prints no button.
	 *     @type string     $button_label Button label with an optional `{price}`; '' uses "Add to basket".
	 *     @type string     $link_label   Text link label; '' prints no link.
	 *     @type string     $link_url     Text link address; '' uses `$shop_url`.
	 *     @type string     $shop_url     The shop page.
	 * }
	 * @return string Escaped markup.
	 */
	function sgs_cart_empty_state_html( array $args ): string {
		$image   = (string) ( $args['image_html'] ?? '' );
		$body    = trim( (string) ( $args['body'] ?? '' ) );
		$product = is_array( $args['product'] ?? null ) ? $args['product'] : null;
		$url     = trim( (string) ( $args['link_url'] ?? '' ) );
		if ( '' === $image && '' === $body && null === $product && '' === $url ) {
			return '';
		}

		$html = '<div class="sgs-cart__panel-empty sgs-cart__panel-empty--rich">';
		if ( '' !== $image ) {
			$html .= '<div class="sgs-cart__panel-empty-media">' . $image . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the media renderer's escaped markup.
		}
		$html .= '<h3 class="sgs-cart__panel-empty-message">' . sgs_rich_text_kses( (string) ( $args['heading'] ?? '' ) ) . '</h3>';
		if ( '' !== $body ) {
			$html .= '<p class="sgs-cart__panel-empty-body">' . sgs_rich_text_kses( $body ) . '</p>';
		}
		if ( null !== $product ) {
			$template = trim( (string) ( $args['button_label'] ?? '' ) );
			$template = '' === $template ? __( 'Add to basket', 'sgs-blocks' ) : $template;
			$label    = esc_html( str_replace( '{price}', wp_strip_all_tags( (string) ( $product['price_text'] ?? '' ) ), wp_strip_all_tags( $template ) ) );
			if ( (int) ( $product['add_id'] ?? 0 ) > 0 ) {
				$html .= sprintf( '<button type="button" class="sgs-cart__panel-empty-cta sgs-cart__panel-empty-add" data-sgs-cart-empty-add="%1$d">%2$s</button>', (int) $product['add_id'], $label );
			} else {
				$html .= sprintf( '<a class="sgs-cart__panel-empty-cta sgs-cart__panel-empty-add" href="%1$s">%2$s</a>', esc_url( (string) ( $product['url'] ?? '' ) ), $label );
			}
		}
		$link_label = trim( (string) ( $args['link_label'] ?? '' ) );
		if ( '' !== $link_label ) {
			$html .= sprintf(
				'<a class="sgs-cart__panel-empty-link" href="%1$s">%2$s</a>',
				esc_url( '' !== $url ? $url : (string) ( $args['shop_url'] ?? '' ) ),
				sgs_rich_text_kses( $link_label, false )
			);
		}
		return $html . '</div>';
	}
}
