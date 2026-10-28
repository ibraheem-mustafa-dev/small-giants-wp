<?php
/**
 * Gift card purchase flow on the product page and in the cart (Spec 27, FR-27-GC1 and FR-27-GC4).
 *
 * Validates the form server-side, stores the recipient details on the cart line,
 * sets the line price from the chosen amount (never from a posted price) and
 * copies the details onto the order line item so the issuer can build the card.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Cart and order hooks for gift-card lines.
 */
final class Gift_Card_Purchase {

	/** Cart line key holding the validated purchase data. */
	const CART_KEY = 'sgs_gift_card';

	/** Order line item meta key holding the same data. */
	const ITEM_META = '_sgs_gift_card';

	/** Nonce action for the product-page form. */
	const NONCE_ACTION = 'sgs_gift_card_add';

	/** Nonce field name. */
	const NONCE_FIELD = 'sgs_gift_card_nonce';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'woocommerce_add_to_cart_validation', array( __CLASS__, 'validate_add_to_cart' ), 20, 2 );
		\add_filter( 'woocommerce_add_cart_item_data', array( __CLASS__, 'add_cart_item_data' ), 10, 2 );
		\add_action( 'woocommerce_before_calculate_totals', array( __CLASS__, 'apply_price' ), 20 );
		\add_filter( 'woocommerce_get_item_data', array( __CLASS__, 'display_item_data' ), 10, 2 );
		\add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'copy_to_order_item' ), 10, 3 );
		\add_action( 'woocommerce_sgs_gift_card_add_to_cart', array( Gift_Card_Form_View::class, 'print_form' ) );
		\add_filter( 'render_block', array( __CLASS__, 'replace_add_to_cart_block' ), 10, 3 );
	}

	/**
	 * Validate the form when a gift card is added to the cart.
	 *
	 * @param bool $passed     Current verdict.
	 * @param int  $product_id Product id.
	 * @return bool
	 */
	public static function validate_add_to_cart( $passed, $product_id ): bool {
		$product = \wc_get_product( (int) $product_id );
		if ( ! $passed || ! Gift_Card_Product_Type::is_gift_card( $product ) ) {
			return (bool) $passed;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified on the next line.
		$nonce = isset( $_POST[ self::NONCE_FIELD ] ) ? \sanitize_text_field( \wp_unslash( $_POST[ self::NONCE_FIELD ] ) ) : '';
		if ( ! \wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			\wc_add_notice( \__( 'The gift card form has expired. Please reload the page and try again.', 'sgs-blocks' ), 'error' );
			return false;
		}

		$result = self::read_request( $product );
		foreach ( $result['errors'] as $message ) {
			\wc_add_notice( \esc_html( $message ), 'error' );
		}
		return $result['ok'];
	}

	/**
	 * Attach the validated data to the cart line.
	 *
	 * @param array<string,mixed> $data       Cart item data.
	 * @param int                 $product_id Product id.
	 * @return array<string,mixed>
	 */
	public static function add_cart_item_data( $data, $product_id ): array {
		$data    = (array) $data;
		$product = \wc_get_product( (int) $product_id );
		if ( ! Gift_Card_Product_Type::is_gift_card( $product ) ) {
			return $data;
		}
		$result = self::read_request( $product );
		if ( $result['ok'] ) {
			$data[ self::CART_KEY ] = $result['data'];
		}
		return $data;
	}

	/**
	 * Price each gift-card line from its chosen amount.
	 *
	 * @param \WC_Cart $cart The cart.
	 * @return void
	 */
	public static function apply_price( $cart ): void {
		if ( \is_admin() && ! \wp_doing_ajax() ) {
			return;
		}
		foreach ( $cart->get_cart() as $item ) {
			if ( empty( $item[ self::CART_KEY ]['amount_pence'] ) ) {
				continue;
			}
			$pence = Gift_Card_Money::to_pence( (int) $item[ self::CART_KEY ]['amount_pence'], true );
			if ( null !== $pence ) {
				$item['data']->set_price( Gift_Card_Money::decimal( $pence ) );
			}
		}
	}

	/**
	 * Show the recipient details under the line in the cart, checkout and emails.
	 *
	 * @param array<int,array<string,string>> $rows Existing rows.
	 * @param array<string,mixed>             $item Cart item.
	 * @return array<int,array<string,string>>
	 */
	public static function display_item_data( $rows, $item ): array {
		$rows = (array) $rows;
		if ( empty( $item[ self::CART_KEY ] ) ) {
			return $rows;
		}
		return \array_merge( $rows, self::display_rows( $item[ self::CART_KEY ] ) );
	}

	/**
	 * Copy the data onto the order line item.
	 *
	 * @param \WC_Order_Item_Product $line   Order line item.
	 * @param string                 $key    Cart item key.
	 * @param array<string,mixed>    $values Cart item values.
	 * @return void
	 */
	public static function copy_to_order_item( $line, $key, $values ): void {
		unset( $key );
		if ( empty( $values[ self::CART_KEY ] ) || ! \is_array( $values[ self::CART_KEY ] ) ) {
			return;
		}
		$line->add_meta_data( self::ITEM_META, $values[ self::CART_KEY ], true );
		foreach ( self::display_rows( $values[ self::CART_KEY ] ) as $row ) {
			$line->add_meta_data( $row['key'], $row['value'], true );
		}
	}

	/**
	 * Swap WooCommerce's add-to-cart blocks for the gift-card form on a gift-card product.
	 *
	 * @param string              $content Rendered block.
	 * @param array<string,mixed> $parsed  Parsed block.
	 * @param \WP_Block|null      $block   Block instance.
	 * @return string
	 */
	public static function replace_add_to_cart_block( $content, $parsed, $block = null ): string {
		$name = (string) ( $parsed['blockName'] ?? '' );
		if ( 'woocommerce/add-to-cart-form' !== $name && 'woocommerce/add-to-cart-with-options' !== $name ) {
			return (string) $content;
		}
		$post_id = ( $block instanceof \WP_Block && isset( $block->context['postId'] ) ) ? (int) $block->context['postId'] : (int) \get_the_ID();
		$product = $post_id > 0 ? \wc_get_product( $post_id ) : null;
		if ( ! Gift_Card_Product_Type::is_gift_card( $product ) ) {
			return (string) $content;
		}
		return Gift_Card_Form_View::render( $product );
	}

	/**
	 * Read and validate the posted fields for a product.
	 *
	 * @param \WC_Product $product A gift-card product.
	 * @return array{ok:bool,errors:array<string,string>,data:array<string,mixed>}
	 */
	public static function read_request( $product ): array {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- callers verify the nonce first; data is validated and sanitised below.
		$input = \wp_unslash( $_POST );
		return Gift_Card_Purchase_Fields::validate(
			\is_array( $input ) ? $input : array(),
			$product->amounts_config(),
			Gift_Card_Services::settings(),
			Gift_Card_Services::today()
		);
	}

	/**
	 * Label and value rows for a purchase.
	 *
	 * @param array<string,mixed> $data Purchase data.
	 * @return array<int,array<string,string>> Rows with name, value (display) and key.
	 */
	public static function display_rows( array $data ): array {
		$rows = array(
			array(
				'key'   => \__( 'For', 'sgs-blocks' ),
				'value' => (string) ( $data['recipient_name'] ?? '' ),
			),
			array(
				'key'   => \__( 'Recipient email', 'sgs-blocks' ),
				'value' => (string) ( $data['recipient_email'] ?? '' ),
			),
			array(
				'key'   => \__( 'From', 'sgs-blocks' ),
				'value' => (string) ( $data['sender_name'] ?? '' ),
			),
			array(
				'key'   => \__( 'Send on', 'sgs-blocks' ),
				'value' => ! empty( $data['send_on'] ) ? (string) $data['send_on'] : \__( 'Straight after payment', 'sgs-blocks' ),
			),
		);
		if ( ! empty( $data['message'] ) ) {
			$rows[] = array(
				'key'   => \__( 'Message', 'sgs-blocks' ),
				'value' => (string) $data['message'],
			);
		}
		return \array_map(
			static fn( array $row ): array => array(
				'name'  => $row['key'],
				'key'   => $row['key'],
				'value' => $row['value'],
			),
			$rows
		);
	}
}
