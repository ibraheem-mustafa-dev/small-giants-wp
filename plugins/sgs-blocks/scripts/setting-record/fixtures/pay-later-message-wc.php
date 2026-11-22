<?php
// The Stripe gateway for the offline render of sgs/pay-later-message: the plugin's class present (render.php returns
// before anything prints unless class_exists( 'WC_Stripe' )) and WooCommerce's gateway list holding `stripe_klarna`
// enabled for every method (includes/commerce-blocks/helpers-pay-later.php::sgs_pay_later_method_enabled reads
// WC()->payment_gateways()->payment_gateways()[ 'stripe_<method>' ]->enabled === 'yes'; `method` defaults to klarna).
// Commerce_Blocks_Assets::enqueue() only queues the block's script (it prints nothing), so a no-op stands in for it.
// No absolute path: the runner's working directory is the plugin folder being rendered.
namespace SGS\Blocks\Commerce_Blocks {
	if ( ! class_exists( __NAMESPACE__ . '\Commerce_Blocks_Assets', false ) ) {
		final class Commerce_Blocks_Assets {
			public static function enqueue(): void {}
		}
	}
}
namespace {
	if ( ! class_exists( 'WC_Stripe', false ) ) {
		class WC_Stripe {}
	}
	if ( ! function_exists( 'WC' ) ) {
		function WC() {
			static $wc = null;
			if ( null === $wc ) {
				$wc = new class() {
					public $session = null;
					public $cart    = null;
					public function payment_gateways() {
						return new class() {
							public function payment_gateways() {
								// Every `stripe_<method>` is enabled, so each method the check tries (the setting's values) prints.
								return new class() implements ArrayAccess {
									public function offsetExists( $id ): bool { return 0 === strpos( (string) $id, 'stripe_' ); }
									public function offsetGet( $id ): mixed { return (object) array( 'enabled' => 'yes' ); }
									public function offsetSet( $id, $value ): void {}
									public function offsetUnset( $id ): void {}
								};
							}
						};
					}
				};
			}
			return $wc;
		}
	}
	require getcwd() . '/src/blocks/pay-later-message/render.php';
}
