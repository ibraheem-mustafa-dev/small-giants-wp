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
	 *     @type string $placement     'footer' (default: between the item list and the footer) or 'after-items' (the view script
	 *                                 keeps it inside the scrolling list, under the last line).
	 * }
	 * @return string Escaped markup.
	 */
	function sgs_cart_gift_box_html( array $args ): string {
		$id   = (string) ( $args['id'] ?? 'sgs-cart' );
		$help = trim( (string) ( $args['help'] ?? '' ) );

		$after = 'after-items' === ( $args['placement'] ?? 'footer' );
		$html  = sprintf(
			'<div class="sgs-cart__panel-gift%3$s" data-sgs-cart-gift%4$s data-rest-url="%1$s" data-nonce="%2$s" hidden>',
			esc_url( (string) ( $args['rest_url'] ?? '' ) ),
			esc_attr( (string) ( $args['nonce'] ?? '' ) ),
			$after ? ' sgs-cart__panel-gift--after-items' : '',
			$after ? ' data-sgs-cart-after-rows' : ''
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
	 * What the empty state's button does with a chosen product: the one-tap add the buy box would make if the shopper changed nothing.
	 *
	 * The defaults come from the buy box's own sources. A variable product uses the configurator manifest's default variation
	 * (`Product_Manifest::build()` `defaultAxes`: WooCommerce's default attributes, else the first in-stock combination). Each
	 * "Pick a set" group (`Configurator_Groups`, `sgs_picks_active_groups`) starts with its "Start with" option, as the buy box
	 * ticks it, with the whole pack on it under counted sharing. The picks are then run through the server's own check
	 * (`sgs_picks_check`) with the default pack size; a refusal means no complete default exists.
	 *
	 * `body` is the request body for the SGS cart proxy (`POST /sgs/v1/cart/add-item`, the buy box's add route: it checks the
	 * attributes and the picks again on the server) and is set only when the add needs a variation or picks; a plain simple
	 * product has `body` null and is added through the Store API. `add_id` 0 means no one-tap add: the button links to the page.
	 *
	 * @param object     $product A WooCommerce product (or anything with the same methods).
	 * @param array|null $deps    Test seams: `manifest` ( int $id ): ?array, `groups` ( int $id ): array, `pack` ( int $id, int $variation_id, array $variations, array $groups ): ?int, `get_product` ( int $id ). Default: the live classes.
	 * @return array{id:int,add_id:int,url:string,price:string,body:?array}
	 */
	function sgs_cart_empty_product( $product, ?array $deps = null ): array {
		$deps    = (array) $deps;
		$id      = (int) $product->get_id();
		$out     = array(
			'id'     => $id,
			'add_id' => 0,
			'url'    => (string) $product->get_permalink(),
			'price'  => (string) $product->get_price(),
			'body'   => null,
		);
		$buyable = static function ( $candidate ): bool {
			return $candidate && $candidate->is_purchasable() && $candidate->is_in_stock();
		};
		$type    = (string) $product->get_type();

		$variation_id = 0;
		$variation    = array();
		$price        = $out['price'];
		if ( 'simple' === $type ) {
			if ( ! $buyable( $product ) ) {
				return $out;
			}
		} elseif ( 'variable' === $type ) {
			if ( ! isset( $deps['manifest'] ) ) {
				require_once __DIR__ . '/class-product-manifest.php';
			}
			$manifest = isset( $deps['manifest'] ) ? $deps['manifest']( $id ) : \SGS\Blocks\Product_Manifest::build( $id );
			$axes     = is_array( $manifest ) ? (array) ( $manifest['defaultAxes'] ?? array() ) : array();
			$combo    = is_array( $manifest ) ? ( $manifest['combos'][ (string) ( $manifest['defaultKey'] ?? '' ) ] ?? null ) : null;
			if ( ! $axes || ! is_array( $combo ) || empty( $combo['inStock'] ) || (int) ( $combo['variationId'] ?? 0 ) <= 0 ) {
				return $out;
			}
			$variation_id = (int) $combo['variationId'];
			$get_product  = $deps['get_product'] ?? 'wc_get_product';
			$chosen       = $get_product( $variation_id );
			if ( ! $buyable( $chosen ) ) {
				return $out;
			}
			$price = (string) $chosen->get_price();
			foreach ( $axes as $key => $slug ) {
				$variation[] = array(
					'attribute' => (string) $key,
					'value'     => (string) $slug,
				);
			}
		} else {
			return $out;
		}

		$groups = isset( $deps['groups'] ) ? $deps['groups']( $id ) : \SGS\Blocks\Configurator_Groups::for_product( $id );
		$active = \SGS\Blocks\sgs_picks_active_groups( (array) $groups );
		$picks  = array();
		if ( $active ) {
			$posted = array();
			foreach ( $variation as $pair ) {
				$posted[ 'attribute_' . $pair['attribute'] ] = $pair['value'];
			}
			$pack = isset( $deps['pack'] ) ? $deps['pack']( $id, $variation_id, $posted, (array) $groups ) : \SGS\Blocks\Configurator_Picks::pack_for( $id, $variation_id, $posted, (array) $groups );
			foreach ( $active as $key => $group ) {
				$start = (string) ( $group['flags']['startWith'] ?? '' );
				$slugs = array_map( static fn( $term ) => (string) $term['slug'], (array) $group['terms'] );
				if ( '' === $start || ! in_array( $start, $slugs, true ) ) {
					return $out;
				}
				$counted         = 'counts' === \SGS\Blocks\sgs_picks_share_mode( $group['flags']['share'] ?? 'none' ) && null !== $pack && $pack > 0;
				$picks[ $key ][] = array(
					'slug'  => $start,
					'count' => $counted ? (int) $pack : 0,
				);
			}
			if ( '' !== \SGS\Blocks\sgs_picks_check( (array) $groups, $picks, $pack )['error'] ) {
				return $out;
			}
		}

		$out['add_id'] = $variation_id > 0 ? $variation_id : $id;
		$out['price']  = $price;
		if ( $variation || $picks ) {
			$out['body'] = array(
				'id'        => $out['add_id'],
				'quantity'  => 1,
				'variation' => $variation,
				'picks'     => $picks ? $picks : new \stdClass(),
			);
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
		$html .= '<p class="sgs-cart__panel-empty-message">' . sgs_rich_text_kses( (string) ( $args['heading'] ?? '' ) ) . '</p>';
		if ( '' !== $body ) {
			$html .= '<p class="sgs-cart__panel-empty-body">' . sgs_rich_text_kses( $body ) . '</p>';
		}
		if ( null !== $product ) {
			$template = trim( (string) ( $args['button_label'] ?? '' ) );
			$template = '' === $template ? __( 'Add to basket', 'sgs-blocks' ) : $template;
			$label    = esc_html( str_replace( '{price}', wp_strip_all_tags( (string) ( $product['price_text'] ?? '' ) ), wp_strip_all_tags( $template ) ) );
			if ( (int) ( $product['add_id'] ?? 0 ) > 0 ) {
				// A product that needs a variation or picks is added through the SGS cart proxy with this body; a plain one through the Store API.
				$proxy = is_array( $product['body'] ?? null )
					? sprintf( ' data-add-body="%1$s" data-rest-url="%2$s" data-nonce="%3$s"', esc_attr( (string) wp_json_encode( $product['body'] ) ), esc_url( (string) ( $product['rest_url'] ?? '' ) ), esc_attr( (string) ( $product['nonce'] ?? '' ) ) )
					: '';
				$html .= sprintf( '<button type="button" class="sgs-cart__panel-empty-cta sgs-cart__panel-empty-add" data-sgs-cart-empty-add="%1$d"%3$s>%2$s</button>', (int) $product['add_id'], $label, $proxy ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $proxy is built from esc_attr/esc_url above.
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

if ( ! function_exists( 'sgs_cart_upsell_html' ) ) {
	/**
	 * The upsell row: an optional picture, a heading, an optional line of text and an Add button for one product. It starts
	 * hidden; the view script keeps it under the basket lines, inside the scrolling list, while the basket holds an item and
	 * not this product. The button adds the product the way the empty state's button does (`data-sgs-cart-empty-add`, with
	 * the SGS cart proxy body for a variation or picks), or links to the product page when no one-tap add exists.
	 *
	 * @param array $args {
	 *     Resolved values.
	 *
	 *     @type array  $product      `sgs_cart_empty_product()` result plus `price_text`, `name`, `rest_url` and `nonce`.
	 *     @type string $title        Heading; '' uses the product name.
	 *     @type string $text         Line under the heading with an optional `{price}`; '' prints none.
	 *     @type string $button_label Button label with an optional `{price}`; '' uses "Add".
	 *     @type string $image_html   The product picture's markup; '' prints none.
	 * }
	 * @return string Escaped markup, or '' with no product.
	 */
	function sgs_cart_upsell_html( array $args ): string {
		$product = is_array( $args['product'] ?? null ) ? $args['product'] : null;
		if ( null === $product || (int) ( $product['id'] ?? 0 ) <= 0 ) {
			return '';
		}
		$price = wp_strip_all_tags( (string) ( $product['price_text'] ?? '' ) );
		$words = static function ( string $template ) use ( $price ): string {
			return str_replace( '{price}', $price, wp_strip_all_tags( $template ) );
		};
		$title = trim( (string) ( $args['title'] ?? '' ) );
		$title = '' === $title ? (string) ( $product['name'] ?? '' ) : $title;
		$text  = trim( (string) ( $args['text'] ?? '' ) );
		$label = trim( (string) ( $args['button_label'] ?? '' ) );
		$label = '' === $label ? __( 'Add', 'sgs-blocks' ) : $label;

		$html = sprintf( '<div class="sgs-cart__panel-upsell" data-sgs-cart-upsell="%d" data-sgs-cart-after-rows hidden>', (int) $product['id'] );
		$img  = (string) ( $args['image_html'] ?? '' );
		if ( '' !== $img ) {
			$html .= $img; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce's escaped product image markup.
		}
		$html .= '<div class="sgs-cart__panel-upsell-text"><p class="sgs-cart__panel-upsell-title">' . esc_html( $words( $title ) ) . '</p>';
		if ( '' !== $text ) {
			$html .= '<p class="sgs-cart__panel-upsell-body">' . esc_html( $words( $text ) ) . '</p>';
		}
		$html .= '</div>';
		if ( (int) ( $product['add_id'] ?? 0 ) > 0 ) {
			$proxy = is_array( $product['body'] ?? null )
				? sprintf( ' data-add-body="%1$s" data-rest-url="%2$s" data-nonce="%3$s"', esc_attr( (string) wp_json_encode( $product['body'] ) ), esc_url( (string) ( $product['rest_url'] ?? '' ) ), esc_attr( (string) ( $product['nonce'] ?? '' ) ) )
				: '';
			$html .= sprintf( '<button type="button" class="sgs-cart__panel-upsell-add" data-sgs-cart-empty-add="%1$d"%3$s>%2$s</button>', (int) $product['add_id'], esc_html( $words( $label ) ), $proxy ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $proxy is built from esc_attr/esc_url above.
		} else {
			$html .= sprintf( '<a class="sgs-cart__panel-upsell-add" href="%1$s">%2$s</a>', esc_url( (string) ( $product['url'] ?? '' ) ), esc_html( $words( $label ) ) );
		}
		return $html . '</div>';
	}
}
