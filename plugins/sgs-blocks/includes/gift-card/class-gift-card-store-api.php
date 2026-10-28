<?php
/**
 * Gift card Store API extension (Spec 27, FR-27-GC5 and FR-27-GC10).
 *
 * Registers, against WooCommerce's Store API (verified against WooCommerce
 * trunk `src/StoreApi/Schemas/ExtendSchema.php`):
 *
 * - `woocommerce_store_api_register_endpoint_data()` on the cart and checkout
 *   endpoints, namespace `sgs_gift_card`. The namespace is deliberately NOT `sgs`:
 *   a second registration on the same endpoint and namespace silently replaces
 *   the first (see includes/cart-item-extensions.php).
 * - `woocommerce_store_api_register_update_callback()` for the same namespace,
 *   which `cart/extensions` calls with `data` before recalculating the cart.
 *
 * The block UI (assets/js/gift-card-checkout.js) reads the extension data and
 * posts apply and remove through `wc.blocksCheckout.extensionCartUpdate`.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- messages are escaped with esc_html() before reaching RouteException.

defined( 'ABSPATH' ) || exit;

/**
 * Store API wiring.
 */
final class Gift_Card_Store_Api {

	/**
	 * Register endpoint data and the update callback (runs on woocommerce_blocks_loaded).
	 *
	 * @return void
	 */
	public static function register(): void {
		if ( ! \function_exists( 'woocommerce_store_api_register_endpoint_data' ) || ! \function_exists( 'woocommerce_store_api_register_update_callback' ) ) {
			return;
		}
		$endpoints = array();
		if ( \class_exists( '\Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema' ) ) {
			$endpoints[] = \Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema::IDENTIFIER;
		}
		if ( \class_exists( '\Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema' ) ) {
			$endpoints[] = \Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema::IDENTIFIER;
		}
		foreach ( $endpoints as $endpoint ) {
			\woocommerce_store_api_register_endpoint_data(
				array(
					'endpoint'        => $endpoint,
					'namespace'       => Gift_Card_Redemption::STORE_API_NS,
					'data_callback'   => array( __CLASS__, 'data' ),
					'schema_callback' => array( __CLASS__, 'schema' ),
					'schema_type'     => ARRAY_A,
				)
			);
		}
		\woocommerce_store_api_register_update_callback(
			array(
				'namespace' => Gift_Card_Redemption::STORE_API_NS,
				'callback'  => array( __CLASS__, 'update' ),
			)
		);
	}

	/**
	 * Extension data for the cart and checkout responses.
	 *
	 * @return array<string,mixed>
	 */
	public static function data(): array {
		$cart     = \WC()->cart;
		$settings = Gift_Card_Services::settings();
		$cards    = array();
		if ( $cart ) {
			$amounts = Gift_Card_Redemption::applied_amounts( $cart );
			foreach ( Gift_Card_Redemption::applied_ids() as $id ) {
				$card = Gift_Card_Services::store()->find( $id );
				if ( null === $card ) {
					continue;
				}
				$applied = (int) ( $amounts[ $id ] ?? 0 );
				$cards[] = array(
					'id'        => $id,
					'last4'     => (string) $card['code_last4'],
					'applied'   => Gift_Card_Money::format( $applied ),
					'remaining' => Gift_Card_Money::format( \max( 0, (int) $card['balance_pence'] - (int) $card['reserved_pence'] ) ),
				);
			}
		}
		return array(
			'cards'    => $cards,
			'canApply' => ! Gift_Card_Redemption::cart_has_gift_card() && \count( $cards ) < (int) $settings->get( 'max_cards_per_order' ),
			'blocked'  => Gift_Card_Redemption::cart_has_gift_card(),
			'terms'    => Gift_Card_Form_View::terms_text( $settings ),
		);
	}

	/**
	 * Schema for the extension data.
	 *
	 * @return array<string,mixed>
	 */
	public static function schema(): array {
		return array(
			'cards'    => array(
				'description' => \__( 'Gift cards applied to this basket.', 'sgs-blocks' ),
				'type'        => 'array',
				'readonly'    => true,
				'items'       => array(
					'type'       => 'object',
					'properties' => array(
						'id'        => array( 'type' => 'integer' ),
						'last4'     => array( 'type' => 'string' ),
						'applied'   => array( 'type' => 'string' ),
						'remaining' => array( 'type' => 'string' ),
					),
				),
			),
			'canApply' => array(
				'description' => \__( 'Whether another gift card can be applied.', 'sgs-blocks' ),
				'type'        => 'boolean',
				'readonly'    => true,
			),
			'blocked'  => array(
				'description' => \__( 'True when the basket holds a gift card, which a gift card cannot pay for.', 'sgs-blocks' ),
				'type'        => 'boolean',
				'readonly'    => true,
			),
			'terms'    => array(
				'description' => \__( 'Expiry and refund wording.', 'sgs-blocks' ),
				'type'        => 'string',
				'readonly'    => true,
			),
		);
	}

	/**
	 * Apply or remove a card. WooCommerce recalculates the cart after this returns.
	 *
	 * @param array<string,mixed> $data Request data: action (apply or remove), code or card_id.
	 * @return void
	 * @throws \Automattic\WooCommerce\StoreApi\Exceptions\RouteException On a refused code.
	 * @throws Gift_Card_Exception On a refused code when the Store API classes are absent.
	 */
	public static function update( $data ): void {
		$data   = \is_array( $data ) ? $data : array();
		$action = isset( $data['action'] ) ? \sanitize_key( (string) $data['action'] ) : '';

		if ( 'remove' === $action ) {
			Gift_Card_Redemption::remove( isset( $data['card_id'] ) ? \absint( $data['card_id'] ) : 0 );
			return;
		}
		if ( 'apply' !== $action ) {
			return;
		}

		try {
			Gift_Card_Redemption::apply( isset( $data['code'] ) ? \sanitize_text_field( (string) $data['code'] ) : '' );
		} catch ( Gift_Card_Exception $e ) {
			$status = Gift_Card_Exception::RATE_LIMITED === $e->reason() ? 429 : 400;
			if ( \class_exists( '\Automattic\WooCommerce\StoreApi\Exceptions\RouteException' ) ) {
				throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException( 'sgs_gift_card_refused', \esc_html( $e->getMessage() ), (int) $status ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- escaped.
			}
			throw $e;
		}
	}
}
