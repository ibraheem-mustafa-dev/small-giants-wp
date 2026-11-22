<?php
// An order the visitor may view, for the offline render of sgs/order-items. render.php prints nothing on the front end
// unless \SGS\Blocks\Order_Binding::viewable_order() returns an order (class_exists check, then a null return), and the
// runner's get_query_var() answers every query var as unset, so the real class's order-received lookup cannot be reached:
// a class of the same name hands the block one order. The order answers what
// includes/order-items/helpers-order-items.php::sgs_order_items_data asks of a WC_Order: two lines (the first with a
// picture, 9001 in fixtures/attachments.json, and two options; the second without options), a delivery method and cost,
// a discount and a total through get_order_item_totals(), a guest customer and a flat-rate shipping line (the Show-to order
// rules in includes/conditional-visibility.php::order_rule_passes read get_customer_id() and each shipping method's
// get_method_id() through includes/helpers-order-pickup.php::sgs_order_is_pickup), and the gift card's amount
// (sgs_order_items_gift_card_pence reads SGS\Blocks\Gift_Card\Gift_Card_Order::fee_amounts, so a class with that method
// stands in for the gift card feature). wc_price() is the one the product stub (--product-file) defines; it is declared
// here when absent. No absolute path: the runner's working directory is the plugin folder being rendered.
namespace SGS\Blocks\Gift_Card {
	if ( ! class_exists( __NAMESPACE__ . '\Gift_Card_Order', false ) ) {
		final class Gift_Card_Order {
			public static function fee_amounts( $order ): array { return array( 1000 ); }
		}
	}
}
namespace SGS\Blocks {
	if ( ! class_exists( __NAMESPACE__ . '\Order_Binding', false ) ) {
		final class Order_Binding {
			public static function viewable_order() {
				return new class() {
					public function get_currency() { return 'GBP'; }
					public function get_items() {
						$line = static function ( $name, $qty, $price, $image, $meta ) {
							return new class( $name, $qty, $price, $image, $meta ) {
								public function __construct( private $name, private $qty, private $price, private $image, private $meta ) {}
								public function get_name() { return $this->name; }
								public function get_quantity() { return $this->qty; }
								public function get_price() { return $this->price; }
								public function get_product_id() { return 9301; }
								public function get_product() {
									$image = $this->image;
									return new class( $image ) {
										public function __construct( private $image ) {}
										public function get_image_id() { return $this->image; }
									};
								}
								public function get_formatted_meta_data() {
									return array_map( static fn( $m ) => (object) array( 'display_key' => $m[0], 'display_value' => $m[1] ), $this->meta );
								}
							};
						};
						return array(
							$line( 'Calibration sunglasses', 2, '£98.00', 9001, array( array( 'Colour', 'Tortoise' ), array( 'Size', 'Medium' ) ) ),
							$line( 'Lens cloth', 1, '£4.00', 0, array() ),
						);
					}
					public function get_formatted_line_subtotal( $item ) { return '<span class="woocommerce-Price-amount amount">' . $item->get_price() . '</span>'; }
					public function get_order_item_totals() {
						$money = static fn( $v ) => array( 'value' => '<span class="woocommerce-Price-amount amount">' . $v . '</span>' );
						return array( 'cart_subtotal' => $money( '£102.00' ), 'discount' => $money( '-£5.00' ), 'order_total' => $money( '£91.95' ) );
					}
					public function get_shipping_methods() { return array( new class() { public function get_method_id() { return 'flat_rate'; } } ); }
					public function get_customer_id() { return 0; }
					public function get_shipping_total() { return '3.95'; }
					public function get_shipping_tax() { return '0.00'; }
					public function get_shipping_method() { return 'Tracked delivery'; }
				};
			}
		}
	}
}
namespace {
	if ( ! function_exists( 'wc_price' ) ) {
		function wc_price( $price, $args = array() ) { return '<span class="woocommerce-Price-amount amount">£' . number_format( (float) $price, 2 ) . '</span>'; }
	}
	require getcwd() . '/src/blocks/order-items/render.php';
}
