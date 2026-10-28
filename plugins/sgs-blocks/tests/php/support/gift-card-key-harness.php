<?php
/**
 * Child-process harness for GiftCardCodeKeyTest (Spec 27, FR-27-GC3).
 *
 * Runs the REAL Gift_Card_Code::default_key()/create_key() against a fake options table whose
 * add_option() refuses to overwrite (like WordPress), and a wp_salt() stub whose value the scenarios
 * change. Pass `--constant` to define SGS_GIFT_CARD_CODE_KEY before anything runs.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

namespace {

	define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );
	$GLOBALS['t_options']  = array();
	$GLOBALS['t_autoload'] = array();
	$GLOBALS['t_salt']     = 'salt-before-rotation';
	$GLOBALS['t_add_calls'] = 0;

	function get_option( $k, $d = false ) { return $GLOBALS['t_options'][ $k ] ?? $d; }
	function add_option( $k, $v, $deprecated = '', $autoload = true ) {
		++$GLOBALS['t_add_calls'];
		if ( array_key_exists( $k, $GLOBALS['t_options'] ) ) {
			return false; // WordPress add_option() never overwrites.
		}
		$GLOBALS['t_options'][ $k ]  = $v;
		$GLOBALS['t_autoload'][ $k ] = $autoload;
		return true;
	}
	function wp_salt( $scheme = '' ) { return $GLOBALS['t_salt']; }

	if ( in_array( '--constant', $argv, true ) ) {
		define( 'SGS_GIFT_CARD_CODE_KEY', 'constant-key-from-wp-config' );
	}

	require_once __DIR__ . '/gift-card-domain.php';

	use SGS\Blocks\Gift_Card\Gift_Card_Code;
	use SGS\Blocks\Gift_Card\Gift_Card_Ledger;
	use SGS\Blocks\Gift_Card\Gift_Card_Lookup;
	use SGS\Blocks\Gift_Card\Gift_Card_Rate_Limiter;
	use SGS\Blocks\Gift_Card\Gift_Card_Settings;
	use SGS\Blocks\Tests\Support\Memory_Gift_Card_Store;

	$r   = array( 'constant_mode' => in_array( '--constant', $argv, true ) );
	$opt = Gift_Card_Code::KEY_OPTION;

	if ( $r['constant_mode'] ) {
		// The constant beats an option that is already present, and creates nothing.
		$GLOBALS['t_options'][ $opt ] = 'key-from-the-database';
		$r['key']             = Gift_Card_Code::default_key();
		$r['option_after']    = $GLOBALS['t_options'][ $opt ];
		$r['add_calls']       = $GLOBALS['t_add_calls'];
		echo json_encode( $r );
		exit( 0 );
	}

	// 1. Created once, stable, 64 hex characters, autoload off.
	$r['option_before'] = array_key_exists( $opt, $GLOBALS['t_options'] );
	$first              = Gift_Card_Code::default_key();
	$second             = Gift_Card_Code::default_key();
	$third              = Gift_Card_Code::default_key();
	$r['first_is_hex64'] = 1 === preg_match( '/^[0-9a-f]{64}$/', $first );
	$r['stable']         = $first === $second && $second === $third;
	$r['stored_matches'] = ( $GLOBALS['t_options'][ $opt ] ?? null ) === $first;
	$r['autoload']       = $GLOBALS['t_autoload'][ $opt ] ?? 'unset';
	$r['add_calls_after_three_reads'] = $GLOBALS['t_add_calls'];

	// 2. A second create never overwrites the first value.
	$again = Gift_Card_Code::create_key();
	$r['create_again_returns_first'] = $again === $first;
	$r['option_still_first']        = ( $GLOBALS['t_options'][ $opt ] ?? null ) === $first;

	// 2b. Two fresh sites each get their own random key (negative control for "constant value").
	$saved = $GLOBALS['t_options'];
	$GLOBALS['t_options'] = array();
	$other = Gift_Card_Code::default_key();
	$GLOBALS['t_options'] = $saved;
	$r['independent_sites_differ'] = $other !== $first;

	// 3. A concurrent first request: another process stores its key between our get and our add.
	$GLOBALS['t_options'] = array();
	$winner = str_repeat( 'a', 64 );
	$racing_get = true;
	// Simulate: the rival's add_option already happened by the time ours runs.
	$GLOBALS['t_options'][ $opt ] = $winner;
	$r['race_loser_gets_winner'] = Gift_Card_Code::create_key() === $winner && ( $GLOBALS['t_options'][ $opt ] ?? null ) === $winner;
	$GLOBALS['t_options'] = $saved;

	// 4. A card issued under the key is still found after the WordPress salts change.
	$store  = new Memory_Gift_Card_Store();
	$ledger = new Gift_Card_Ledger( $store, new Gift_Card_Settings() );
	$id     = $ledger->create( array( 'initial_pence' => 2500 ), 1700000000 );
	$code   = Gift_Card_Code::generate();
	$norm   = Gift_Card_Code::normalise( $code );
	$ledger->claim_code( $id, Gift_Card_Code::hash( $norm, Gift_Card_Code::default_key() ), Gift_Card_Code::last4( $norm ), 1700000000 );

	$legacy_before = hash_hmac( 'sha256', 'sgs-gift-card-code-v1', wp_salt( 'secure_auth' ) );
	$GLOBALS['t_salt'] = 'salt-AFTER-rotation-or-another-wp-config';
	$legacy_after = hash_hmac( 'sha256', 'sgs-gift-card-code-v1', wp_salt( 'secure_auth' ) );
	$r['old_scheme_would_break'] = $legacy_before !== $legacy_after;

	$limiter = new Gift_Card_Rate_Limiter( fn( $k ) => null, function () {}, 5, 900, 'time' );
	$lookup  = new Gift_Card_Lookup( $store, $ledger, $limiter, Gift_Card_Code::default_key() );
	try {
		$found = $lookup->find_redeemable( $code, 'c1', 1700000000 );
		$r['found_after_salt_change'] = (int) $found['id'] === $id;
	} catch ( \Throwable $e ) {
		$r['found_after_salt_change'] = false;
	}
	$r['key_unchanged_by_salt'] = Gift_Card_Code::default_key() === $first;

	echo json_encode( $r );
}
