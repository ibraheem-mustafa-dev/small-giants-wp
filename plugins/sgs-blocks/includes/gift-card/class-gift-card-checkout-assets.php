<?php
/**
 * Loads the gift-card panel for the Cart and Checkout blocks (Spec 27, FR-27-GC5 and FR-27-GC10).
 *
 * The panel (`assets/js/gift-card-checkout.js`) fills WooCommerce's
 * `ExperimentalDiscountsMeta` slot, which both blocks render in their order
 * summary, and posts apply and remove through `extensionCartUpdate()` to the
 * `sgs_gift_card` Store API namespace. It is a classic script with the
 * `wc-blocks-checkout` dependency because that is how WooCommerce exposes
 * `wc.blocksCheckout` to extensions. It only loads on a page that holds the Cart
 * or Checkout block and only when the shop sells gift cards: at least one published
 * product of the `sgs_gift_card` type. The check is cached in a transient that a
 * product save, status change or deletion clears.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues the panel script and stylesheet.
 */
final class Gift_Card_Checkout_Assets {

	const TRANSIENT = 'sgs_shop_sells_gift_cards';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		\add_action( 'woocommerce_new_product', array( __CLASS__, 'forget_sells_gift_cards' ) );
		\add_action( 'woocommerce_update_product', array( __CLASS__, 'forget_sells_gift_cards' ) );
		\add_action( 'woocommerce_delete_product', array( __CLASS__, 'forget_sells_gift_cards' ) );
		\add_action( 'woocommerce_trash_product', array( __CLASS__, 'forget_sells_gift_cards' ) );
		\add_action( 'transition_post_status', array( __CLASS__, 'forget_on_status_change' ), 10, 3 );
	}

	/**
	 * Whether at least one published gift-card product exists (cached).
	 *
	 * @return bool
	 */
	public static function shop_sells_gift_cards(): bool {
		$cached = \get_transient( self::TRANSIENT );
		if ( false !== $cached ) {
			return '1' === (string) $cached;
		}
		$ids = \get_posts(
			array(
				'post_type'        => 'product',
				'post_status'      => 'publish',
				'posts_per_page'   => 1,
				'fields'           => 'ids',
				'no_found_rows'    => true,
				'suppress_filters' => true,
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- one term lookup, result cached.
				'tax_query'        => array(
					array(
						'taxonomy' => 'product_type',
						'field'    => 'slug',
						'terms'    => array( Gift_Card_Product_Type::TYPE ),
					),
				),
			)
		);
		$sells = ! empty( $ids );
		\set_transient( self::TRANSIENT, $sells ? '1' : '0', \DAY_IN_SECONDS );
		return $sells;
	}

	/**
	 * Clear the cached answer.
	 *
	 * @return void
	 */
	public static function forget_sells_gift_cards(): void {
		\delete_transient( self::TRANSIENT );
	}

	/**
	 * Clear the cached answer when a product is published, unpublished or trashed.
	 *
	 * @param string   $new_status New status.
	 * @param string   $old_status Old status.
	 * @param \WP_Post $post       Post.
	 * @return void
	 */
	public static function forget_on_status_change( $new_status, $old_status, $post ): void {
		if ( $new_status !== $old_status && $post instanceof \WP_Post && 'product' === $post->post_type ) {
			self::forget_sells_gift_cards();
		}
	}

	/**
	 * Enqueue on pages with the Cart or Checkout block.
	 *
	 * @return void
	 */
	public static function enqueue(): void {
		if ( ! \defined( 'SGS_BLOCKS_PATH' ) || ! \defined( 'SGS_BLOCKS_URL' ) ) {
			return;
		}
		$on_cart_page = \function_exists( 'is_cart' ) && ( \is_cart() || \is_checkout() );
		if ( ! $on_cart_page && ! \has_block( 'woocommerce/cart' ) && ! \has_block( 'woocommerce/checkout' ) ) {
			return;
		}
		if ( ! self::shop_sells_gift_cards() ) {
			return;
		}
		$script = SGS_BLOCKS_PATH . 'assets/js/gift-card-checkout.js';
		if ( \file_exists( $script ) ) {
			\wp_enqueue_script(
				'sgs-gift-card-checkout',
				SGS_BLOCKS_URL . 'assets/js/gift-card-checkout.js',
				array( 'wc-blocks-checkout', 'wp-plugins', 'wp-element', 'wp-i18n' ),
				(string) \filemtime( $script ),
				true
			);
		}
		$style = SGS_BLOCKS_PATH . 'assets/css/gift-card.css';
		if ( \file_exists( $style ) ) {
			\wp_enqueue_style( 'sgs-gift-card', SGS_BLOCKS_URL . 'assets/css/gift-card.css', array(), (string) \filemtime( $style ) );
		}
	}
}
