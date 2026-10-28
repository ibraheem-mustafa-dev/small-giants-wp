<?php
/**
 * Gift card redemption on the Cart and Checkout (Spec 27, FR-27-GC5 and FR-27-GC10).
 *
 * The applied cards live in the WooCommerce session as card ids (never codes).
 * Each card becomes a negative cart fee, `sgs_gift_card_<id>`, added at the end of
 * `woocommerce_cart_calculate_fees`, after the item, shipping and tax figures are
 * known (WC_Cart_Totals::calculate runs items, shipping, then fees):
 *
 * - multi-purpose mode: a NON-taxable negative fee. The VAT base is untouched, so
 *   redemption is a payment, not a discount (HMRC VAT information sheet 09/18).
 * - single-purpose mode: a TAXABLE negative fee sized so its tax-inclusive value
 *   is the amount paid, reducing the VAT base because VAT was due at sale.
 *
 * The block Cart and Checkout reach this through the Store API: extension data
 * under the `sgs_gift_card` namespace on the cart and checkout endpoints, and one
 * update callback on `cart/extensions` for apply and remove (WooCommerce's
 * ExtendSchema::register_endpoint_data and register_update_callback).
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- messages are fixed, translated strings; the Store API layer escapes before showing them.

defined( 'ABSPATH' ) || exit;

/**
 * Cart-side redemption.
 */
final class Gift_Card_Redemption {

	/** Store API extension namespace. */
	const STORE_API_NS = 'sgs_gift_card';

	/** Session key holding the applied card ids. */
	const SESSION_KEY = 'sgs_gift_card_ids';

	/** Cart fee id prefix. */
	const FEE_PREFIX = 'sgs_gift_card_';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'woocommerce_cart_calculate_fees', array( __CLASS__, 'add_fees' ), 999 );
		\add_action( 'woocommerce_blocks_loaded', array( Gift_Card_Store_Api::class, 'register' ) );
	}

	/**
	 * Card ids applied in this session.
	 *
	 * @return array<int,int>
	 */
	public static function applied_ids(): array {
		if ( ! \function_exists( 'WC' ) || ! \WC()->session ) {
			return array();
		}
		$ids = \WC()->session->get( self::SESSION_KEY, array() );
		return \is_array( $ids ) ? \array_values( \array_unique( \array_map( 'intval', $ids ) ) ) : array();
	}

	/**
	 * Save the applied ids.
	 *
	 * @param array<int,int> $ids Card ids.
	 * @return void
	 */
	public static function save_ids( array $ids ): void {
		\WC()->session->set( self::SESSION_KEY, \array_values( \array_unique( \array_map( 'intval', $ids ) ) ) );
	}

	/**
	 * Whether the cart holds a gift card (a gift card cannot pay for a gift card).
	 *
	 * @param \WC_Cart|null $cart Cart.
	 * @return bool
	 */
	public static function cart_has_gift_card( $cart = null ): bool {
		$cart = $cart ?? ( \function_exists( 'WC' ) ? \WC()->cart : null );
		if ( ! $cart ) {
			return false;
		}
		foreach ( $cart->get_cart() as $item ) {
			if ( ! empty( $item['data'] ) && Gift_Card_Product_Type::is_gift_card( $item['data'] ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Apply a typed code to the cart.
	 *
	 * @param string $code Typed code.
	 * @return int The card id applied.
	 * @throws Gift_Card_Exception With the uniform message for any bad code.
	 */
	public static function apply( string $code ): int {
		if ( self::cart_has_gift_card() ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::CART_HAS_GIFT_CARD, \__( 'A gift card cannot be used to buy another gift card.', 'sgs-blocks' ) );
		}
		$ids = self::applied_ids();
		if ( \count( $ids ) >= (int) Gift_Card_Services::settings()->get( 'max_cards_per_order' ) ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::INVALID, Gift_Card_Services::uniform_message() );
		}

		try {
			$card = Gift_Card_Services::lookup()->find_redeemable( $code, Gift_Card_Services::client_key() );
		} catch ( Gift_Card_Exception $e ) {
			throw new Gift_Card_Exception( $e->reason(), Gift_Card_Services::uniform_message() );
		}

		$ids[] = (int) $card['id'];
		self::save_ids( $ids );
		return (int) $card['id'];
	}

	/**
	 * Remove an applied card from the cart.
	 *
	 * @param int $card_id Card id.
	 * @return void
	 */
	public static function remove( int $card_id ): void {
		self::save_ids( \array_diff( self::applied_ids(), array( $card_id ) ) );
	}

	/**
	 * Add one negative fee per applied card.
	 *
	 * @param \WC_Cart $cart The cart being totalled.
	 * @return void
	 */
	public static function add_fees( $cart ): void {
		if ( \is_admin() && ! \wp_doing_ajax() && ! \defined( 'REST_REQUEST' ) ) {
			return;
		}
		$ids = self::applied_ids();
		if ( array() === $ids || self::cart_has_gift_card( $cart ) ) {
			return;
		}
		$settings = Gift_Card_Services::settings();
		if ( ! $settings->get( 'allow_with_coupons' ) && array() !== $cart->get_applied_coupons() ) {
			return;
		}

		$payable = self::payable_pence( $cart, (bool) $settings->get( 'allow_on_delivery' ) );
		$limits  = self::limits( $ids );
		$alloc   = Gift_Card_Money::allocate( $limits, $payable );

		$rate = $settings->is_multi_purpose() ? 0.0 : self::tax_rate( (string) $settings->get( 'spv_tax_class' ) );
		foreach ( $alloc as $card_id => $gross ) {
			$card = Gift_Card_Services::store()->find( $card_id );
			if ( null === $card ) {
				continue;
			}
			$net = $settings->is_multi_purpose() ? $gross : Gift_Card_Money::net_for_gross( $gross, $rate );
			$cart->fees_api()->add_fee(
				array(
					'id'        => self::FEE_PREFIX . $card_id,
					/* translators: %s: last four characters of the gift card code */
					'name'      => \sprintf( \__( 'Gift card ending %s', 'sgs-blocks' ), $card['code_last4'] ),
					'amount'    => -( $net / 100 ),
					'taxable'   => ! $settings->is_multi_purpose(),
					'tax_class' => (string) $settings->get( 'spv_tax_class' ),
				)
			);
		}
	}

	/**
	 * Pence still to pay once items, tax, delivery (when allowed) and other fees are counted.
	 *
	 * @param \WC_Cart $cart     The cart.
	 * @param bool     $shipping Count delivery charges.
	 * @return int
	 */
	public static function payable_pence( $cart, bool $shipping ): int {
		$total = (float) $cart->get_cart_contents_total() + (float) $cart->get_cart_contents_tax();
		if ( $shipping ) {
			$total += (float) $cart->get_shipping_total() + (float) $cart->get_shipping_tax();
		}
		foreach ( $cart->fees_api()->get_fees() as $fee ) {
			if ( 0 !== \strpos( (string) $fee->id, self::FEE_PREFIX ) ) {
				$total += (float) $fee->amount;
			}
		}
		return \max( 0, (int) \round( $total * 100 ) );
	}

	/**
	 * Most each applied card can pay now, including what this shopper's pending order already holds.
	 *
	 * @param array<int,int> $ids Card ids.
	 * @return array<int,int> Card id => pence.
	 */
	public static function limits( array $ids ): array {
		$store  = Gift_Card_Services::store();
		$ledger = Gift_Card_Services::ledger();
		$order  = self::pending_order_id();
		$out    = array();
		foreach ( $ids as $id ) {
			$card = $store->find( $id );
			if ( null === $card ) {
				continue;
			}
			$held = $order > 0 ? Gift_Card_Ledger::open_reserved( $store->ledger_for_order( $id, $order ) ) : 0;
			$free = $ledger->is_redeemable( $card ) ? \max( 0, (int) $card['balance_pence'] - (int) $card['reserved_pence'] + $held ) : 0;
			if ( $free > 0 ) {
				$out[ $id ] = $free;
			}
		}
		return $out;
	}

	/**
	 * The shopper's draft or awaiting-payment order id, if any.
	 *
	 * @return int
	 */
	public static function pending_order_id(): int {
		if ( ! \function_exists( 'WC' ) || ! \WC()->session ) {
			return 0;
		}
		$draft = (int) \WC()->session->get( 'store_api_draft_order', 0 );
		return $draft > 0 ? $draft : (int) \WC()->session->get( 'order_awaiting_payment', 0 );
	}

	/**
	 * What each applied card is paying in the current cart, in pence (gross).
	 *
	 * @param \WC_Cart $cart The calculated cart.
	 * @return array<int,int> Card id => pence.
	 */
	public static function applied_amounts( $cart ): array {
		$out = array();
		foreach ( $cart->get_fees() as $fee ) {
			if ( 0 === \strpos( (string) $fee->id, self::FEE_PREFIX ) ) {
				$out[ (int) \substr( (string) $fee->id, \strlen( self::FEE_PREFIX ) ) ] = (int) \round( -( (float) $fee->total + (float) $fee->tax ) * 100 );
			}
		}
		return $out;
	}

	/**
	 * Combined tax rate (percent) of a tax class for the store's base location.
	 *
	 * @param string $tax_class Tax class slug ('' is Standard).
	 * @return float
	 */
	private static function tax_rate( string $tax_class ): float {
		$sum = 0.0;
		foreach ( \WC_Tax::get_rates( $tax_class ) as $rate ) {
			$sum += (float) $rate['rate'];
		}
		return $sum;
	}
}
