<?php
/**
 * Standalone runner: llms.txt is off until a site switches it on, and never lists a page that is not published.
 *
 * Run with: php plugins/sgs-blocks/tests/php/run-llms-txt-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	define( 'HOUR_IN_SECONDS', 3600 );
	$GLOBALS['t'] = array(
		'options' => array(),
		'filters' => array(),
		'posts'   => array(),
	);
	function add_action() {}
	function apply_filters( $hook, $value ) {
		foreach ( $GLOBALS['t']['filters'][ $hook ] ?? array() as $cb ) {
			$value = $cb( $value );
		}
		return $value;
	}
	function get_option( $k, $d = false ) { return $GLOBALS['t']['options'][ $k ] ?? $d; }
	function get_post( $id ) { return $GLOBALS['t']['posts'][ $id ] ?? null; }
	function get_permalink( $p ) {
		$p = is_object( $p ) ? $p : ( $GLOBALS['t']['posts'][ $p ] ?? null );
		return $p->post_status === 'publish' ? 'https://shop.example/' . $p->post_name . '/' : 'https://shop.example/?page_id=' . $p->ID;
	}
	function wc_get_page_id( $k ) { return $GLOBALS['t']['options'][ 'wc_' . $k ] ?? -1; }
	function esc_url_raw( $u ) { return $u; }
	function get_privacy_policy_url() { return 'https://shop.example/?page_id=3'; }
	function page( int $id, string $name, string $status, string $password = '' ) {
		$GLOBALS['t']['posts'][ $id ] = (object) array( 'ID' => $id, 'post_name' => $name, 'post_status' => $status, 'post_password' => $password );
	}

	require dirname( __DIR__, 2 ) . '/includes/class-llms-txt-builders.php';
	require dirname( __DIR__, 2 ) . '/includes/class-llms-txt.php';

	use SGS\Blocks\Llms_Txt;
	use SGS\Blocks\Llms_Txt_Builders;

	$failures = 0;
	$total    = 0;
	$check    = static function ( string $label, bool $ok, string $detail = '' ) use ( &$failures, &$total ): void {
		++$total;
		echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . ( $ok || '' === $detail ? '' : ' (' . $detail . ')' ) . "\n";
		$failures += $ok ? 0 : 1;
	};

	// Off by default.
	$check( 'off when the option was never saved', false === Llms_Txt::is_enabled() );
	$GLOBALS['t']['options']['sgs_llms_txt_enabled'] = '0';
	$check( 'off when the option is 0', false === Llms_Txt::is_enabled() );
	$GLOBALS['t']['options']['sgs_llms_txt_enabled'] = '1';
	$check( 'on when the option is 1', true === Llms_Txt::is_enabled() );
	unset( $GLOBALS['t']['options']['sgs_llms_txt_enabled'] );
	$GLOBALS['t']['filters']['sgs_llms_txt_enabled'] = array( static fn() => true );
	$check( 'on when the filter says so', true === Llms_Txt::is_enabled() );
	$GLOBALS['t']['filters'] = array();

	// Pages that are not published are not listed.
	page( 103, 'terms', 'publish' );
	page( 104, 'refund_returns', 'draft' );
	page( 3, 'privacy-policy', 'publish' );
	page( 5, 'members', 'publish', 'secret' );
	$check( 'a published page gives its permalink', 'https://shop.example/terms/' === Llms_Txt_Builders::published_page_url( 103 ) );
	$check( 'a draft page gives nothing (not the ?page_id link)', '' === Llms_Txt_Builders::published_page_url( 104 ) );
	$check( 'a password-protected page gives nothing', '' === Llms_Txt_Builders::published_page_url( 5 ) );
	$check( 'a missing page gives nothing', '' === Llms_Txt_Builders::published_page_url( 999 ) );
	$GLOBALS['t']['options'] += array( 'wc_terms' => 103, 'woocommerce_refund_returns_page_id' => 104, 'wp_page_for_privacy_policy' => 3 );
	$lines = implode( "\n", Llms_Txt_Builders::build_policy_lines() );
	$check( 'the policy list holds privacy and terms and not the draft returns page', false !== strpos( $lines, 'Privacy Policy' ) && false !== strpos( $lines, 'Terms' ) && false === strpos( $lines, 'Refund' ) && false === strpos( $lines, 'page_id' ), $lines );
	$GLOBALS['t']['posts'][104]->post_status = 'publish';
	$check( 'the returns page is listed once it is published, at its permalink', false !== strpos( implode( "\n", Llms_Txt_Builders::build_policy_lines() ), 'https://shop.example/refund_returns/' ) );
	$GLOBALS['t']['posts'][3]->post_status = 'draft';
	$check( 'an unpublished privacy page is not listed', false === strpos( implode( "\n", Llms_Txt_Builders::build_policy_lines() ), 'Privacy' ) );

	echo "\n==== " . ( $total - $failures ) . ' of ' . $total . ' checks passed (' . $failures . " failed) ====\n";
	exit( $failures > 0 ? 1 : 0 );
}
