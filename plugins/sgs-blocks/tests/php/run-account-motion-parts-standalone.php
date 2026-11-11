<?php
/**
 * Standalone test: the account block's page header, sign-in forms and open-tab content are motion parts.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-motion-parts-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
require __DIR__ . '/stubs/motion-render-stubs.php';

$parts    = SGS\Blocks\Motion\Sgs_Motion_Targets::parts( 'sgs/account' );
$failures = 0;
foreach ( array( 'headerBlock', 'authGrid', 'lostForm', 'tabContent' ) as $part ) {
	$ok = isset( $parts[ $part ] );
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . "$part is a motion target\n";
	$failures += $ok ? 0 : 1;
}
exit( $failures ? 1 : 0 );
