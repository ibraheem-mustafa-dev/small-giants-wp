<?php
/**
 * The WooCommerce product class for a gift card (Spec 27, FR-27-GC1).
 *
 * Loaded lazily by {@see Gift_Card_Product_Type::product_class()} because it
 * extends a WooCommerce class that only exists once WooCommerce has loaded.
 *
 * A gift card is virtual and sold individually (one card per cart line, each with
 * its own recipient). Its price is never taken from the product page: the cart
 * resolves it from the amount the shopper chose, against the amounts configured
 * here ({@see Gift_Card_Purchase::apply_price()}).
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Product type `sgs_gift_card`.
 */
class Gift_Card_Product extends \WC_Product_Simple {

	/** The WooCommerce product type slug. */
	const TYPE = 'sgs_gift_card';

	/**
	 * The product type slug.
	 *
	 * @return string
	 */
	public function get_type() {
		return self::TYPE;
	}

	/**
	 * A gift card is delivered by email: nothing ships.
	 *
	 * @param string $context View or edit.
	 * @return bool
	 */
	public function is_virtual( $context = 'view' ) {
		unset( $context );
		return true;
	}

	/**
	 * One card per cart line, so every card keeps its own recipient and message.
	 *
	 * @return bool
	 */
	public function is_sold_individually() {
		return true;
	}

	/**
	 * Shop-loop buttons send the shopper to the product page, where the amount and recipient are chosen.
	 *
	 * @return string
	 */
	public function add_to_cart_url() {
		return (string) \get_permalink( $this->get_id() );
	}

	/**
	 * Shop-loop button label.
	 *
	 * @return string
	 */
	public function add_to_cart_text() {
		return \__( 'Choose an amount', 'sgs-blocks' );
	}

	/**
	 * No one-click add to basket: a gift card needs its form.
	 *
	 * @param string $feature Feature name.
	 * @return bool
	 */
	public function supports( $feature ) {
		return 'ajax_add_to_cart' === $feature ? false : parent::supports( $feature );
	}

	/**
	 * Purchasable only while at least one amount is configured.
	 *
	 * @return bool
	 */
	public function is_purchasable() {
		$config = $this->amounts_config();
		return parent::is_purchasable() && ( array() !== $config['amounts'] || $config['custom_enabled'] );
	}

	/**
	 * VAT at sale: none for a multi-purpose voucher, the store's tax class for a single-purpose one.
	 *
	 * @param string $context View or edit.
	 * @return string
	 */
	public function get_tax_status( $context = 'view' ) {
		if ( Gift_Card_Settings::load()->is_multi_purpose() ) {
			return 'none';
		}
		return 'taxable';
	}

	/**
	 * The tax class used when VAT is due at sale (single-purpose mode).
	 *
	 * @param string $context View or edit.
	 * @return string
	 */
	public function get_tax_class( $context = 'view' ) {
		return (string) Gift_Card_Settings::load()->get( 'spv_tax_class' );
	}

	/**
	 * The configured amounts.
	 *
	 * @return array{amounts:array<int,int>,custom_enabled:bool,custom_min:int,custom_max:int}
	 */
	public function amounts_config(): array {
		$amounts = $this->get_meta( Gift_Card_Amounts::META_AMOUNTS, true );
		return Gift_Card_Amounts::config(
			\is_array( $amounts ) ? $amounts : array(),
			'yes' === $this->get_meta( Gift_Card_Amounts::META_CUSTOM, true ),
			(int) $this->get_meta( Gift_Card_Amounts::META_CUSTOM_MIN, true ),
			(int) $this->get_meta( Gift_Card_Amounts::META_CUSTOM_MAX, true )
		);
	}

	/**
	 * "From £15.00" or a range, never a single misleading price.
	 *
	 * @param string $price Unused.
	 * @return string
	 */
	public function get_price_html( $price = '' ) {
		unset( $price );
		$config = $this->amounts_config();
		$all    = $config['amounts'];
		if ( $config['custom_enabled'] ) {
			$all[] = $config['custom_min'];
			$all[] = $config['custom_max'];
		}
		if ( array() === $all ) {
			return '';
		}
		$low  = \min( $all );
		$high = \max( $all );
		if ( $low === $high ) {
			return \wc_price( $low / 100 );
		}
		return \wc_format_price_range( $low / 100, $high / 100 );
	}
}
