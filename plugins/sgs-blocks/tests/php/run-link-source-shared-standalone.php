<?php
/**
 * Standalone runner for the shared link-source resolver (includes/helpers-link-source.php) and its
 * use by sgs_link_attributes() (includes/helpers-link.php).
 *
 * Plain PHP, no PHPUnit and no WordPress: Sgs_Site_Info is an in-memory store, posts are a small
 * fixture table, and the real Sgs_Site_Info_Binding (the one Maps / social link rule) is loaded.
 * Exits non-zero on any failure.
 *
 * Covers every source ('' / url, post:<id>, phone, email, whatsapp, directions, google, every
 * social, top, account, unknown), an empty Site Info field (falls back to the typed URL; no typed
 * URL means no link, sgs/button's rule), a deleted and an unpublished page (typed URL), refused
 * schemes, and sgs_link_attributes() with and without a source. Two negative controls prove the
 * scheme gate and the post-visibility check are load-bearing.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-link-source-shared-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are the established
// run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Generic.Files.OneObjectStructurePerFile.MultipleFound

namespace {

	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	}

	function is_email( $email ) {
		return false !== filter_var( $email, FILTER_VALIDATE_EMAIL ) ? $email : false;
	}

	function antispambot( $email ) {
		return '[obscured]' . $email;
	}

	function wp_strip_all_tags( $text ) {
		return trim( strip_tags( (string) $text ) );
	}

	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}

	function esc_url( $url ) {
		// Enough of core for these assertions: refuse javascript:, keep everything else.
		return preg_match( '/^\s*javascript:/i', (string) $url ) ? '' : str_replace( '&', '&#038;', (string) $url );
	}

	function sanitize_key( $key ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
	}

	function wp_login_url() {
		return 'https://example.test/wp-login.php';
	}

	/** Script modules enqueued during the run. */
	$GLOBALS['sgs_test_modules'] = array();

	function wp_enqueue_script_module( $id ) {
		$GLOBALS['sgs_test_modules'][] = $id;
	}

	function generate_block_asset_handle( $block_name, $field_name ) {
		return str_replace( '/', '-', $block_name ) . '-view-script-module';
	}

	/** Post fixtures: id => [status, permalink]. 41 is deleted (absent). */
	$GLOBALS['sgs_test_posts'] = array(
		12 => array( 'publish', 'https://example.test/about-us/' ),
		13 => array( 'draft', 'https://example.test/?p=13' ),
		14 => array( 'publish', 'javascript:alert(1)' ),
	);

	function get_post( $id ) {
		$id = (int) $id;
		if ( ! isset( $GLOBALS['sgs_test_posts'][ $id ] ) ) {
			return null;
		}
		$post              = new stdClass();
		$post->ID          = $id;
		$post->post_status = $GLOBALS['sgs_test_posts'][ $id ][0];
		return $post;
	}

	function is_post_publicly_viewable( $post ) {
		return 'publish' === $post->post_status;
	}

	function get_permalink( $post ) {
		return $GLOBALS['sgs_test_posts'][ $post->ID ][1];
	}
}

namespace SGS\Blocks {

	/** In-memory Site Info with the real store's dot-notation reads. */
	class Sgs_Site_Info {
		/** @var array<string,mixed> */
		public static $store = array();

		public static function get( string $key, $fallback = '' ) {
			$value = self::$store;
			foreach ( explode( '.', $key ) as $part ) {
				if ( ! is_array( $value ) || ! array_key_exists( $part, $value ) ) {
					return $fallback;
				}
				$value = $value[ $part ];
			}
			return $value;
		}
	}
}

namespace {

	require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-site-info-binding.php';
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-link-source.php';
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-link.php';

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

	function href( string $source, string $typed ): string {
		return sgs_resolve_link_source( $source, $typed )['url'];
	}

	$full_site_info = array(
		'phone'    => '0121 729 8233',
		'email'    => 'hello@example.test',
		'address'  => '1 High Street<br>Birmingham',
		'maps_url' => 'https://maps.google.com/?cid=123456',
		'socials'  => array(
			'google'    => 'https://g.page/r/acme-review',
			'facebook'  => 'https://www.facebook.com/acme',
			'instagram' => '@acme',
			'twitter'   => 'acme',
			'linkedin'  => 'https://www.linkedin.com/company/acme',
			'youtube'   => 'https://www.youtube.com/@acme',
			'tiktok'    => 'acme',
			'whatsapp'  => 'https://wa.me/441217298233',
		),
	);
	$typed          = 'https://typed.example/fallback';

	// --- Typed URL: '' and 'url' leave it untouched -------------------------------------------
	\SGS\Blocks\Sgs_Site_Info::$store = $full_site_info;
	ok( $typed === href( '', $typed ), "'' returns the typed URL" );
	ok( $typed === href( 'url', $typed ), "'url' returns the typed URL" );
	ok( '' === href( '', '' ), "'' with no typed URL is no link" );
	ok( 'tel:+44' === sgs_link_source_href( '', 'tel:+44' ), "sgs_link_source_href('') is the typed URL unchanged" );
	ok( $typed === href( 'nonsense', $typed ), 'an unknown source keeps the typed URL' );

	// --- Page or post by ID --------------------------------------------------------------------
	ok( 12 === sgs_link_source_post_id( 'post:12' ), 'post:12 names post 12' );
	ok( 0 === sgs_link_source_post_id( 'post:0' ) && 0 === sgs_link_source_post_id( 'post:12x' ) && 0 === sgs_link_source_post_id( 'post:' ), 'malformed post sources name no post' );
	ok( 'https://example.test/about-us/' === href( 'post:12', 'https://example.test/old-slug/' ), 'a published page resolves to its current permalink, not the stored URL' );
	ok( 'https://example.test/old-slug/' === href( 'post:41', 'https://example.test/old-slug/' ), 'a deleted page falls back to the last picked URL' );
	ok( '' === href( 'post:41', '' ), 'a deleted page with no stored URL is no link' );
	ok( 'https://example.test/old-slug/' === href( 'post:13', 'https://example.test/old-slug/' ), 'an unpublished (draft) page falls back to the stored URL' );
	ok( 'https://example.test/old-slug/' === href( 'post:14', 'https://example.test/old-slug/' ), 'a permalink with a refused scheme falls back to the stored URL' );

	// --- Site Info sources, filled ---------------------------------------------------------------
	ok( 'tel:01217298233' === href( 'phone', $typed ), 'phone: tel: link from Site Info' );
	$sgs_saved_phone                            = \SGS\Blocks\Sgs_Site_Info::$store['phone'] ?? null;
	\SGS\Blocks\Sgs_Site_Info::$store['phone'] = 'Call us';
	ok( $typed === href( 'phone', $typed ), 'phone: a Site Info value with no digits falls back to the typed URL, never a bare tel:' );
	\SGS\Blocks\Sgs_Site_Info::$store['phone'] = $sgs_saved_phone;
	ok( 'mailto:[obscured]hello@example.test' === href( 'email', $typed ), 'email: antispambot mailto: link from Site Info' );
	ok( 'https://wa.me/441217298233' === href( 'whatsapp', $typed ), 'whatsapp: the stored wa.me link' );
	ok( 'https://maps.google.com/?cid=123456' === href( 'directions', $typed ), 'directions: the Site Info Maps link' );
	ok( 'https://g.page/r/acme-review' === href( 'google', $typed ), 'google: the Business Profile link' );
	ok( 'https://www.facebook.com/acme' === href( 'facebook', $typed ), 'facebook: the stored link' );
	ok( 'https://www.instagram.com/acme' === href( 'instagram', $typed ), 'instagram: a handle completes to the profile URL' );
	ok( 'https://x.com/acme' === href( 'twitter', $typed ), 'twitter: a handle completes to the profile URL' );
	ok( 'https://www.linkedin.com/company/acme' === href( 'linkedin', $typed ), 'linkedin: the stored link' );
	ok( 'https://www.youtube.com/@acme' === href( 'youtube', $typed ), 'youtube: the stored link' );
	ok( 'https://www.tiktok.com/@acme' === href( 'tiktok', $typed ), 'tiktok: a handle completes to the profile URL' );

	// Directions without a Maps URL: the place CID, then an address search.
	\SGS\Blocks\Sgs_Site_Info::$store = array(
		'maps_cid' => '987',
		'address'  => '1 High Street',
	);
	ok( 'https://maps.google.com/?cid=987' === href( 'directions', $typed ), 'directions: the place CID when there is no Maps URL' );
	\SGS\Blocks\Sgs_Site_Info::$store = array( 'address' => '1 High Street<br>Birmingham' );
	ok( 'https://www.google.com/maps/search/?api=1&query=1%20High%20Street%2C%20Birmingham' === href( 'directions', $typed ), 'directions: an address search when there is no Maps URL or CID' );

	// --- Site Info sources, empty: typed URL, else no link ----------------------------------------
	\SGS\Blocks\Sgs_Site_Info::$store = array();
	foreach ( array( 'phone', 'email', 'whatsapp', 'directions', 'google', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok' ) as $source ) {
		ok( $typed === href( $source, $typed ), "$source with an empty Site Info field falls back to the typed URL" );
		ok( '' === href( $source, '' ), "$source with an empty Site Info field and no typed URL is no link" );
	}

	// --- Refused schemes ------------------------------------------------------------------------
	\SGS\Blocks\Sgs_Site_Info::$store = array(
		'maps_url' => 'javascript:alert(1)',
		'socials'  => array(
			'facebook' => 'javascript:alert(1)',
			'google'   => 'data:text/html,hi',
		),
	);
	ok( $typed === href( 'directions', $typed ), 'a javascript: Maps URL is refused; the typed URL is used' );
	ok( $typed === href( 'facebook', $typed ), 'a javascript: social link is refused; the typed URL is used' );
	ok( $typed === href( 'google', $typed ), 'a data: Business Profile link is refused; the typed URL is used' );
	ok( false === sgs_link_source_is_safe_url( 'JavaScript:alert(1)' ), 'the scheme gate is case-insensitive' );
	ok( false === sgs_link_source_is_safe_url( "https://a.test/\nx" ), 'a URL holding a control character is refused' );
	ok( true === sgs_link_source_is_safe_url( '/contact/' ) && true === sgs_link_source_is_safe_url( '#top' ), 'relative paths and fragments are allowed' );
	foreach ( array( 'http://a.test', 'https://a.test', 'mailto:a@b.test', 'tel:+441' ) as $allowed ) {
		ok( true === sgs_link_source_is_safe_url( $allowed ), "allowed scheme: $allowed" );
	}

	// NEGATIVE CONTROL 1: the scheme gate is load-bearing. The binding's own rule lets a non-social
	// key through as stored, so without sgs_link_source_is_safe_url() the hostile Maps URL would
	// reach the href.
	ok( 'javascript:alert(1)' === \SGS\Blocks\Sgs_Site_Info_Binding::link_for_key( 'address' ), 'NEGATIVE CONTROL: link_for_key() alone passes the javascript: Maps URL through' );

	// NEGATIVE CONTROL 2: the visibility check is load-bearing. A draft's raw permalink is a real
	// string, so a resolver that skipped is_post_publicly_viewable() would print it.
	ok( '' !== get_permalink( get_post( 13 ) ) && 'https://example.test/?p=13' !== href( 'post:13', '' ), 'NEGATIVE CONTROL: a draft has a permalink, and the resolver still refuses it' );

	// --- Back to top and account ------------------------------------------------------------------
	$GLOBALS['sgs_test_modules'] = array();
	$top                         = sgs_resolve_link_source( 'top', $typed );
	ok( '#top' === $top['url'] && array( 'data-sgs-link-source' => 'top' ) === $top['attrs'], 'top: #top plus its data attribute, ignoring the typed URL' );
	ok( in_array( 'sgs-button-view-script-module', $GLOBALS['sgs_test_modules'], true ), "top: enqueues sgs/button's view module (focus handling) for any block" );
	ok( ' data-sgs-link-source="top"' === sgs_link_source_attrs_html( 'top' ), 'sgs_link_source_attrs_html(top) prints the escaped data attribute' );
	ok( '' === sgs_link_source_attrs_html( '' ) && '' === sgs_link_source_attrs_html( 'phone' ) && '' === sgs_link_source_attrs_html( 'post:12' ), 'every other source adds no attributes' );
	ok( 'https://example.test/wp-login.php' === href( 'account', $typed ), 'account: the login screen without WooCommerce' );

	// --- sgs_link_attributes(): unchanged without a source, resolved with one ------------------------
	\SGS\Blocks\Sgs_Site_Info::$store = $full_site_info;
	$plain = array(
		'url'           => 'https://example.com/a',
		'opensInNewTab' => true,
		'rel'           => 'nofollow',
	);
	ok( ' href="https://example.com/a" target="_blank" rel="nofollow noopener"' === sgs_link_attributes( $plain ), 'sgs_link_attributes() with no source: the exact pre-change string' );
	ok( sgs_link_attributes( $plain ) === sgs_link_attributes( $plain + array( 'source' => '' ) ), "sgs_link_attributes() with source '' is byte-identical" );
	ok( ' href="tel:01217298233"' === sgs_link_attributes( array( 'url' => '', 'source' => 'phone' ) ), 'sgs_link_attributes() resolves a Site Info source with no typed URL' );
	ok( ' href="#top" data-sgs-link-source="top"' === sgs_link_attributes( array( 'url' => '', 'source' => 'top' ) ), 'sgs_link_attributes() adds the top data attribute' );
	\SGS\Blocks\Sgs_Site_Info::$store = array();
	ok( '' === sgs_link_attributes( array( 'url' => '', 'source' => 'phone' ) ), 'sgs_link_attributes() renders no link for an empty Site Info field with no typed URL' );

	echo "\n$pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
