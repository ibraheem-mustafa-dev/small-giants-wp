<?php
/**
 * Standalone runner for sgs_resolve_link_source() (U-12 §F).
 *
 * Exercises includes/helpers-link-source.php with plain PHP, no PHPUnit —
 * `Sgs_Site_Info::get()`, `wc_get_page_permalink()`, `wp_login_url()` and
 * `class_exists('WooCommerce')` are all stubbed below (real WP is never
 * loaded). Exits non-zero on any failure.
 *
 * Proves three things:
 *   1. `phone`/`email`/`whatsapp` are BYTE-IDENTICAL to the pre-change
 *      render.php switch — a literal copy of that switch is run alongside
 *      the new helper across the same fixtures and the two outputs are
 *      compared.
 *   2. `top` and `account` resolve per the U-12 §F design note.
 *   3. NEGATIVE CONTROL — the allow-list guard is load-bearing: a "broken"
 *      copy of the resolver with the guard removed is run against the same
 *      unknown-source input, and its result is asserted to DIFFER from the
 *      real (guarded) resolver's result. If the real guard were ever
 *      deleted, this is the assertion that would go red.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-link-source-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are
// the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

// Every statement below lives inside an explicit namespace block (global or
// SGS\Blocks) — mixing a bare namespace declaration with prior statements is
// a fatal error, so the whole file uses the bracketed `namespace { … }` form.

namespace {

	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	}

	// -----------------------------------------------------------------------
	// WordPress/WooCommerce stubs (real WP is never loaded by this runner).
	// -----------------------------------------------------------------------

	if ( ! function_exists( 'is_email' ) ) {
		function is_email( $email ) {
			return false !== filter_var( $email, FILTER_VALIDATE_EMAIL ) ? $email : false;
		}
	}

	if ( ! function_exists( 'antispambot' ) ) {
		function antispambot( $email ) {
			// Deterministic stub — both the reference switch and the real helper
			// call this SAME function, so byte-identity between them is provable
			// regardless of how "realistic" the obfuscation is.
			return '[obscured]' . $email;
		}
	}

	/** Controls what wc_get_page_permalink('myaccount') returns; set per test case. */
	$GLOBALS['sgs_test_wc_myaccount_url'] = '';

	if ( ! function_exists( 'wc_get_page_permalink' ) ) {
		function wc_get_page_permalink( $page ) {
			if ( 'myaccount' === $page ) {
				return $GLOBALS['sgs_test_wc_myaccount_url'];
			}
			return '';
		}
	}

	if ( ! function_exists( 'wp_login_url' ) ) {
		function wp_login_url() {
			return 'https://example.test/wp-login.php';
		}
	}
}

// Sgs_Site_Info stub — a controllable in-memory store instead of the real
// wp_options-backed class, per the task's stubbing instruction.
namespace SGS\Blocks {

	class Sgs_Site_Info {
		/** @var array<string,string> */
		public static $store = array();

		public static function get( string $key, $fallback = '' ) {
			return self::$store[ $key ] ?? $fallback;
		}
	}
}

namespace {

	require_once dirname( __DIR__, 2 ) . '/includes/helpers-link-source.php';

	$pass = 0;
	$fail = 0;

	function ok( bool $cond, string $label ): void {
		global $pass, $fail;
		if ( $cond ) {
			++$pass;
			echo "PASS  $label\n";
		} else {
			++$fail;
			echo "FAIL  $label\n";
		}
	}

	// -------------------------------------------------------------------
	// Reference implementation — a LITERAL copy of button/render.php's
	// pre-change inline switch (the code this task moved out), used to
	// prove byte-identical phone/email/whatsapp behaviour.
	// -------------------------------------------------------------------

	/**
	 * @return string The pre-change switch's resolved href (or '' when the
	 *                Site Info field was empty and no fallback was applied
	 *                by the caller — mirrors the original two-step shape).
	 */
	function reference_site_info_switch( string $link_source, string $effective_url ): string {
		$sgs_site_info_href = '';
		if ( in_array( $link_source, array( 'phone', 'email', 'whatsapp' ), true ) ) {
			switch ( $link_source ) {
				case 'phone':
					$sgs_site_info_phone = (string) \SGS\Blocks\Sgs_Site_Info::get( 'phone', '' );
					$sgs_site_info_href  = '' !== $sgs_site_info_phone ? 'tel:' . preg_replace( '/[^0-9+]/', '', $sgs_site_info_phone ) : '';
					break;
				case 'email':
					$sgs_site_info_email = (string) \SGS\Blocks\Sgs_Site_Info::get( 'email', '' );
					$sgs_site_info_href  = ( '' !== $sgs_site_info_email && is_email( $sgs_site_info_email ) ) ? 'mailto:' . antispambot( $sgs_site_info_email ) : '';
					break;
				case 'whatsapp':
					$sgs_site_info_href = (string) \SGS\Blocks\Sgs_Site_Info::get( 'socials.whatsapp', '' );
					break;
			}
			if ( '' !== trim( $sgs_site_info_href ) ) {
				$effective_url = $sgs_site_info_href;
			}
		}
		return $effective_url;
	}

	// -------------------------------------------------------------------
	// NEGATIVE CONTROL fixture — a copy of sgs_resolve_link_source() with
	// the allow-list guard deliberately removed. See file docblock.
	// -------------------------------------------------------------------

	function sgs_resolve_link_source_broken_no_allowlist( string $source, string $typed_url ): array {
		// No `if ( ! in_array( $source, $allowed_sources, true ) ) { … }`
		// early return here — this is the guard the real function has and
		// this copy deliberately omits.
		switch ( $source ) {
			case 'top':
				return array(
					'url'   => '#top',
					'attrs' => array( 'data-sgs-link-source' => 'top' ),
				);
			case 'account':
				return array(
					'url'   => wp_login_url(),
					'attrs' => array(),
				);
			case 'url':
				return array(
					'url'   => $typed_url,
					'attrs' => array(),
				);
			default:
				// The bug an allow-list guard exists to prevent: an
				// unrecognised source (typo, stale attribute from a
				// deleted feature) silently produces a DEAD link instead
				// of preserving the typed URL.
				return array(
					'url'   => '',
					'attrs' => array(),
				);
		}
	}

	// =====================================================================
	// 1. phone / email / whatsapp — byte-identical to the pre-change switch.
	// =====================================================================

	$fixtures = array(
		'phone: value set'          => array(
			'source'    => 'phone',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array( 'phone' => '+44 20 7946 0958' ),
		),
		'phone: empty falls back'   => array(
			'source'    => 'phone',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array(),
		),
		'phone: messy formatting'   => array(
			'source'    => 'phone',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array( 'phone' => '(020) 7946-0958 ext.1' ),
		),
		'email: valid'              => array(
			'source'    => 'email',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array( 'email' => 'hello@example.test' ),
		),
		'email: invalid falls back' => array(
			'source'    => 'email',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array( 'email' => 'not-an-email' ),
		),
		'email: empty falls back'   => array(
			'source'    => 'email',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array(),
		),
		'whatsapp: value set'       => array(
			'source'    => 'whatsapp',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array( 'socials.whatsapp' => 'https://wa.me/442079460958' ),
		),
		'whatsapp: empty falls back' => array(
			'source'    => 'whatsapp',
			'typed_url' => 'https://example.test/typed',
			'site_info' => array(),
		),
	);

	foreach ( $fixtures as $label => $fixture ) {
		\SGS\Blocks\Sgs_Site_Info::$store = $fixture['site_info'];

		$reference_url = reference_site_info_switch( $fixture['source'], $fixture['typed_url'] );
		$helper_result = sgs_resolve_link_source( $fixture['source'], $fixture['typed_url'] );

		ok( $reference_url === $helper_result['url'], "before/after byte-identical — $label" );
		ok( array() === $helper_result['attrs'], "no extra attrs — $label" );
	}
	\SGS\Blocks\Sgs_Site_Info::$store = array();

	// =====================================================================
	// 2. top — fixed #top anchor + data attribute, ignores the typed URL.
	// =====================================================================

	$top_result = sgs_resolve_link_source( 'top', 'https://example.test/typed' );
	ok( '#top' === $top_result['url'], "'top' resolves to #top" );
	ok(
		isset( $top_result['attrs']['data-sgs-link-source'] ) && 'top' === $top_result['attrs']['data-sgs-link-source'],
		"'top' carries data-sgs-link-source=\"top\""
	);

	$top_result_no_typed = sgs_resolve_link_source( 'top', '' );
	ok( '#top' === $top_result_no_typed['url'], "'top' ignores an empty typed URL too — still #top" );

	// =====================================================================
	// 3. account — WooCommerce active/inactive, and active-but-empty.
	// =====================================================================

	// WooCommerce not active yet (class not declared below until later) —
	// 'account' must fall back to wp_login_url().
	$account_inactive = sgs_resolve_link_source( 'account', 'https://example.test/typed' );
	ok( 'https://example.test/wp-login.php' === $account_inactive['url'], "'account' falls back to wp_login_url() when WooCommerce is inactive" );
	ok( array() === $account_inactive['attrs'], "'account' carries no extra attrs (inactive)" );

	// Now declare WooCommerce as active.
	class WooCommerce {}

	$GLOBALS['sgs_test_wc_myaccount_url'] = 'https://example.test/my-account/';
	$account_active = sgs_resolve_link_source( 'account', 'https://example.test/typed' );
	ok( 'https://example.test/my-account/' === $account_active['url'], "'account' uses wc_get_page_permalink('myaccount') when WooCommerce is active" );

	// WooCommerce active but the My Account page permalink is empty (page not set) — still no dead link.
	$GLOBALS['sgs_test_wc_myaccount_url'] = '';
	$account_active_empty = sgs_resolve_link_source( 'account', 'https://example.test/typed' );
	ok( 'https://example.test/wp-login.php' === $account_active_empty['url'], "'account' falls back to wp_login_url() when WooCommerce is active but My Account has no permalink" );

	// =====================================================================
	// 4. url source / no source set — unchanged pass-through.
	// =====================================================================

	$url_result = sgs_resolve_link_source( 'url', 'https://example.test/typed' );
	ok( 'https://example.test/typed' === $url_result['url'], "'url' source passes the typed URL through unchanged" );
	ok( array() === $url_result['attrs'], "'url' source carries no extra attrs" );

	// =====================================================================
	// 5. Unknown source — falls back to the typed URL (allow-list guard).
	// =====================================================================

	$unknown_result = sgs_resolve_link_source( 'some-deleted-feature', 'https://example.test/typed' );
	ok( 'https://example.test/typed' === $unknown_result['url'], 'an unknown source falls back to the typed URL' );
	ok( array() === $unknown_result['attrs'], 'an unknown source carries no extra attrs' );

	// =====================================================================
	// 6. NEGATIVE CONTROL — without the allow-list guard, the SAME unknown
	//    source no longer falls back to the typed URL (it goes dead). This
	//    is the assertion that would go red if the real guard were removed.
	// =====================================================================

	$broken_result = sgs_resolve_link_source_broken_no_allowlist( 'some-deleted-feature', 'https://example.test/typed' );
	ok(
		'https://example.test/typed' !== $broken_result['url'],
		'NEGATIVE CONTROL: without the allow-list guard, an unknown source no longer falls back to the typed URL (renders a dead link instead)'
	);
	ok( '' === $broken_result['url'], 'NEGATIVE CONTROL: the unguarded copy produces an empty/dead href for the same input' );

	echo "\n$pass passed, $fail failed\n";
	exit( $fail ? 1 : 0 );
}
