<?php
/**
 * Manual smoke test for Sgs_Ai_Connector class (Phase 7 Step 7.1).
 *
 * Run on the dev site via:
 *   wp eval-file wp-content/plugins/sgs-blocks/tests/manual-test-sgs-ai-connector.php
 *
 * Verifies:
 *   1. get('nonexistent-provider') returns WP_Error (no fatal)
 *   2. is_available() returns false when no providers registered
 *   3. get_all() returns an array (count visible for diagnostic)
 *
 * @package SGS\Blocks
 */

/**
 * Run the smoke test. Wrapped in a function so script-scope variables
 * don't trip the WPCS "global variables must be plugin-prefixed" rule.
 */
function sgs_run_ai_connector_smoke_test() {
	// Confirm WP 7.0 native functions are available — this is the precondition.
	$native_present = function_exists( 'wp_get_connector' )
		&& function_exists( 'wp_get_connectors' )
		&& function_exists( 'wp_is_connector_registered' );

	if ( ! $native_present ) {
		WP_CLI::error( 'PRECONDITION FAIL: WP 7.0 native AI Connector functions are not available. Site WP version may be <7.0.' );
	}

	WP_CLI::log( 'Precondition OK: WP 7.0 native AI Connector functions are present.' );

	// Confirm our wrapper class is loaded.
	if ( ! class_exists( '\\SGS\\Blocks\\Sgs_Ai_Connector' ) ) {
		WP_CLI::error( 'PRECONDITION FAIL: \\SGS\\Blocks\\Sgs_Ai_Connector class not loaded. sgs-blocks plugin may not be active or require_once may have failed.' );
	}

	WP_CLI::log( 'Precondition OK: \\SGS\\Blocks\\Sgs_Ai_Connector class is loaded.' );
	WP_CLI::log( '' );

	// --- Test 1: get() returns WP_Error for an unregistered provider ---.
	$result = \SGS\Blocks\Sgs_Ai_Connector::get( 'sgs-nonexistent-provider' );
	if ( is_wp_error( $result ) ) {
		WP_CLI::success( 'Test 1 PASS: get("sgs-nonexistent-provider") returned WP_Error. Message: ' . $result->get_error_message() );
	} else {
		WP_CLI::error( 'Test 1 FAIL: expected WP_Error, got ' . gettype( $result ) );
	}

	// --- Test 2: is_available() returns false when no providers are registered ---.
	$available = \SGS\Blocks\Sgs_Ai_Connector::is_available();
	if ( false === $available ) {
		WP_CLI::success( 'Test 2 PASS: is_available() returned false (no providers registered).' );
	} elseif ( true === $available ) {
		WP_CLI::log( 'Test 2 NOTE: is_available() returned true — at least one AI provider plugin is active on this site. (Not a failure, just an observation.)' );
	} else {
		WP_CLI::error( 'Test 2 FAIL: is_available() returned non-bool: ' . wp_json_encode( $available ) );
	}

	// --- Test 3: get_all() returns an array ---.
	$all = \SGS\Blocks\Sgs_Ai_Connector::get_all();
	if ( is_array( $all ) ) {
		WP_CLI::success( 'Test 3 PASS: get_all() returned array with ' . count( $all ) . ' connector(s).' );
	} else {
		WP_CLI::error( 'Test 3 FAIL: expected array, got ' . gettype( $all ) );
	}

	WP_CLI::log( '' );
	WP_CLI::log( 'Sgs_Ai_Connector smoke test complete.' );
}

sgs_run_ai_connector_smoke_test();
