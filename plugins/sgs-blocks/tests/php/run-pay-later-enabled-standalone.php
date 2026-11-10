<?php
/**
 * Standalone test: sgs_pay_later_method_enabled() (includes/commerce-blocks/helpers-pay-later.php).
 *
 * The message shows only when WooCommerce's own gateway list holds `stripe_<method>` with enabled 'yes'; the Stripe
 * plugin's legacy accepted-payments option no longer matters (negative control: it is set to the stale value).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-pay-later-enabled-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
require dirname( __DIR__, 2 ) . '/includes/commerce-blocks/helpers-pay-later.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

$on  = (object) array( 'enabled' => 'yes' );
$off = (object) array( 'enabled' => 'no' );

ok( true === sgs_pay_later_method_enabled( 'klarna', array( 'stripe' => $on, 'stripe_klarna' => $on ) ), 'enabled gateway shows' );
ok( false === sgs_pay_later_method_enabled( 'klarna', array( 'stripe' => $on ) ), 'missing gateway hides' );
ok( false === sgs_pay_later_method_enabled( 'klarna', array( 'stripe_klarna' => $off ) ), 'disabled gateway hides' );
ok( false === sgs_pay_later_method_enabled( 'klarna', array() ), 'no gateways hides' );
ok( false === sgs_pay_later_method_enabled( 'affirm', array( 'stripe_klarna' => $on ) ), 'another method does not borrow klarna' );
ok( true === sgs_pay_later_method_enabled( 'afterpay_clearpay', array( 'stripe_afterpay_clearpay' => $on ) ), 'method ids with underscores resolve' );

echo $failures ? "\n$failures FAILED\n" : "\nAll passed\n";
exit( $failures ? 1 : 0 );
