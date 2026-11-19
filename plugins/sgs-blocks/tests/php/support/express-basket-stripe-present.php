<?php
// Stands in for the Stripe plugin's main function; required only by the test that proves the hooks are conditional.
// phpcs:disable
if ( ! function_exists( 'stripe_wc' ) ) {
	function stripe_wc() {
		return null;
	}
}
