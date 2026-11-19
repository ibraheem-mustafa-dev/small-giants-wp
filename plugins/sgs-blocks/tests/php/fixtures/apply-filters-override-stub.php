<?php
/**
 * Stand-in for WordPress's apply_filters for tests that run in their own process: returns the override a test sets in
 * $GLOBALS['sgs_test_filters'][ $hook ], else the value unchanged.
 *
 * @package SGS\Blocks\Tests
 */

if ( ! function_exists( 'apply_filters' ) ) {
	/**
	 * Returns the test's override for the hook, else the value unchanged.
	 *
	 * @param string $hook    Hook name.
	 * @param mixed  $value   The value being filtered.
	 * @param mixed  ...$args Extra arguments.
	 * @return mixed
	 */
	function apply_filters( $hook, $value, ...$args ) { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- stands in for the WordPress function of this name.
		$override = $GLOBALS['sgs_test_filters'][ $hook ] ?? null;
		return is_callable( $override ) ? $override( $value, ...$args ) : $value;
	}
}
