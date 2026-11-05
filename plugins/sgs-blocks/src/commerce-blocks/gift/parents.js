/**
 * The Cart and Checkout areas WooCommerce offers `sgs/gift-order` in. block.json has no `parent` so the block can
 * also sit on a single-product template; WooCommerce reads the areas from the metadata handed to
 * `registerCheckoutBlock`.
 *
 * @package
 */
export const GIFT_ORDER_PARENTS = [
	'woocommerce/cart-items-block',
	'woocommerce/checkout-fields-block',
];
