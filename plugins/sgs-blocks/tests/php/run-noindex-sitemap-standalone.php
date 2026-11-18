<?php
/**
 * Standalone runner: one rule decides "this page is never indexed", and the robots tag and
 * the core sitemap both follow it.
 *
 * - `Noindex_Store_Pages::filter_robots()` adds noindex and nofollow to core's one `wp_robots`
 *   array on cart, checkout, account, endpoint and account-block (sign-in) pages, never on money pages,
 *   and cart and checkout defer to an active SEO plugin.
 * - `Sitemap_Exclusions` leaves those pages, the users sitemap and product tags out of the sitemap.
 *
 * Run with: php plugins/sgs-blocks/tests/php/run-noindex-sitemap-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	define( 'DAY_IN_SECONDS', 86400 );

	class WP_Post {
		public $ID;
		public $post_type = 'page';
		public $post_content = '';
		public function __construct( int $id, string $content ) {
			$this->ID           = $id;
			$this->post_content = $content;
		}
	}

	/** Test state: what the current request is. */
	$GLOBALS['t'] = array(
		'is'       => array(),
		'queried'  => null,
		'seo'      => false,
		'filters'  => array(),
		'wc_pages' => array( 'cart' => 101, 'checkout' => 102, 'myaccount' => 103 ),
		'pages'    => array(),
		'transients' => array(),
		'queries'  => 0,
		'actions'  => array(),
	);
	function add_action( $hook, $cb ) { $GLOBALS['t']['actions'][ $hook ][] = $cb; }
	function get_transient( $k ) { return $GLOBALS['t']['transients'][ $k ] ?? false; }
	function set_transient( $k, $v ) { $GLOBALS['t']['transients'][ $k ] = $v; return true; }
	function delete_transient( $k ) { unset( $GLOBALS['t']['transients'][ $k ] ); return true; }

	function add_filter( $hook, $cb, $priority = 10, $args = 1 ) { $GLOBALS['t']['filters'][ $hook ][] = $cb; return true; }
	function apply_filters( $hook, $value, ...$rest ) {
		foreach ( $GLOBALS['t']['filters'][ 'user:' . $hook ] ?? array() as $cb ) {
			$value = $cb( $value );
		}
		return $value;
	}
	function is_admin() { return false; }
	function is_front_page() { return ! empty( $GLOBALS['t']['is']['front'] ); }
	function is_shop() { return ! empty( $GLOBALS['t']['is']['shop'] ); }
	function is_product() { return ! empty( $GLOBALS['t']['is']['product'] ); }
	function is_product_category() { return ! empty( $GLOBALS['t']['is']['cat'] ); }
	function is_product_tag() { return ! empty( $GLOBALS['t']['is']['tag'] ); }
	function is_cart() { return ! empty( $GLOBALS['t']['is']['cart'] ); }
	function is_checkout() { return ! empty( $GLOBALS['t']['is']['checkout'] ); }
	function is_account_page() { return ! empty( $GLOBALS['t']['is']['account'] ); }
	function is_wc_endpoint_url() { return ! empty( $GLOBALS['t']['is']['endpoint'] ); }
	function get_queried_object() { return $GLOBALS['t']['queried']; }
	function has_block( $name, $post ) { return false !== strpos( $post->post_content, '<!-- wp:' . $name . ' ' ) || false !== strpos( $post->post_content, '<!-- wp:' . $name . ' /-->' ); }
	function wc_get_page_id( $p ) { return $GLOBALS['t']['wc_pages'][ $p ] ?? -1; }
	function get_post( $id ) { return $GLOBALS['t']['pages'][ $id ] ?? null; }
	function sanitize_key( $k ) { return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $k ) ); }
	function wp_unslash( $v ) { return $v; }

	class FakeWpdb {
		public $posts = 'wp_posts';
		public function prepare( $q, ...$a ) { return $q; }
		public function esc_like( $s ) { return $s; }
		public function get_col( $q ) {
			++$GLOBALS['t']['queries'];
			$ids = array();
			foreach ( $GLOBALS['t']['pages'] as $id => $p ) {
				if ( false !== strpos( $p->post_content, '<!-- wp:sgs/account' ) ) {
					$ids[] = $id;
				}
			}
			return $ids;
		}
	}
	$wpdb = new FakeWpdb();
}

namespace SGS\Blocks {
	class Org_Website_Schema {
		public static function seo_plugin_active(): bool { return (bool) $GLOBALS['t']['seo']; }
	}
}

namespace {
	require dirname( __DIR__, 2 ) . '/includes/class-noindex-store-pages.php';
	require dirname( __DIR__, 2 ) . '/includes/class-sitemap-exclusions.php';

	use SGS\Blocks\Noindex_Store_Pages;
	use SGS\Blocks\Sitemap_Exclusions;

	$failures = 0;
	$total    = 0;
	$check    = static function ( string $label, bool $ok, string $detail = '' ) use ( &$failures, &$total ): void {
		++$total;
		echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . ( $ok || '' === $detail ? '' : ' (' . $detail . ')' ) . "\n";
		$failures += $ok ? 0 : 1;
	};
	$request = static function ( array $is, $queried = null, bool $seo = false ): array {
		$GLOBALS['t']['is']      = $is;
		$GLOBALS['t']['queried'] = $queried;
		$GLOBALS['t']['seo']     = $seo;
		return (array) Noindex_Store_Pages::filter_robots( array( 'max-image-preview' => 'large' ) );
	};

	$signin   = new WP_Post( 628, '<!-- wp:sgs/container --><!-- wp:sgs/account {"fieldBackground":"x"} /--><!-- /wp:sgs/container -->' );
	$plain    = new WP_Post( 700, '<!-- wp:sgs/text /-->' );
	$GLOBALS['t']['pages'] = array( 628 => $signin, 700 => $plain, 103 => new WP_Post( 103, '<!-- wp:sgs/account /-->' ) );

	Noindex_Store_Pages::register();
	Sitemap_Exclusions::register();
	$check( 'the rule registers on the wp_robots filter and no longer prints from wp_head', isset( $GLOBALS['t']['filters']['wp_robots'] ) && ! isset( $GLOBALS['t']['filters']['wp_head'] ) );

	// Robots tag.
	$r = $request( array( 'cart' => 1 ) );
	$check( 'cart: noindex and nofollow join the one directive array, others are kept', true === $r['noindex'] && true === $r['nofollow'] && 'large' === $r['max-image-preview'] );
	$GLOBALS['t']['is'] = array( 'cart' => 1 );
	$r = (array) Noindex_Store_Pages::filter_robots( array( 'noindex' => true, 'follow' => true ) );
	$check( 'cart: WooCommerce\'s `follow` is replaced, never printed beside `nofollow`', ! isset( $r['follow'] ) && true === $r['nofollow'] );
	$r = $request( array( 'checkout' => 1 ) );
	$check( 'checkout: noindex', ! empty( $r['noindex'] ) );
	$r = $request( array( 'account' => 1 ) );
	$check( 'account page: noindex', ! empty( $r['noindex'] ) );
	$r = $request( array( 'endpoint' => 1 ) );
	$check( 'WooCommerce endpoint: noindex', ! empty( $r['noindex'] ) );
	$r = $request( array(), $signin );
	$check( 'a page holding the account block (the sign-in page) is noindex with no slug or id rule', ! empty( $r['noindex'] ) && ! empty( $r['nofollow'] ) );
	$r = $request( array(), $plain );
	$check( 'an ordinary page is untouched', ! isset( $r['noindex'] ) );
	foreach ( array( 'front', 'shop', 'product', 'cat', 'tag' ) as $money ) {
		$r = $request( array( $money => 1, 'cart' => 1 ), $signin );
		$check( 'money page (' . $money . ') is never noindexed', ! isset( $r['noindex'] ) );
	}
	$r = $request( array( 'cart' => 1 ), null, true );
	$check( 'cart defers to an active SEO plugin', ! isset( $r['noindex'] ) );
	$r = $request( array( 'account' => 1 ), null, true );
	$check( 'account page is noindexed even with an SEO plugin', ! empty( $r['noindex'] ) );
	$r = $request( array(), $signin, true );
	$check( 'the sign-in page is noindexed even with an SEO plugin', ! empty( $r['noindex'] ) );

	// Sitemap.
	$ids = Noindex_Store_Pages::noindexed_page_ids();
	sort( $ids );
	$check( 'the sitemap list is cart, checkout, account and the account-block pages', array( 101, 102, 103, 628 ) === $ids, json_encode( $ids ) );
	$args = Sitemap_Exclusions::exclude_noindexed_pages( array( 'post__not_in' => array( 5 ) ), 'page' );
	$check( 'the pages sitemap query excludes that list and keeps an existing exclusion', array( 5, 101, 102, 103, 628 ) === $args['post__not_in'], json_encode( $args ) );
	$args = Sitemap_Exclusions::exclude_noindexed_pages( array(), 'post' );
	$check( 'other post types are not touched', array() === $args );
	$check( 'the users provider is off by default', false === Sitemap_Exclusions::filter_provider( new stdClass(), 'users' ) );
	$check( 'the posts provider stays', Sitemap_Exclusions::filter_provider( new stdClass(), 'posts' ) instanceof stdClass );
	$tax = Sitemap_Exclusions::filter_taxonomies( array( 'product_cat' => 1, 'product_tag' => 1 ) );
	$check( 'product tags are left out, categories stay', array( 'product_cat' => 1 ) === $tax );
	$GLOBALS['t']['filters']['user:sgs_sitemap_include_users']        = array( static fn() => true );
	$GLOBALS['t']['filters']['user:sgs_sitemap_include_product_tags'] = array( static fn() => true );
	$GLOBALS['t']['filters']['user:sgs_noindex_page_ids']             = array( static fn( $ids ) => array_merge( $ids, array( 900 ) ) );
	$check( 'a site can opt back in to users', Sitemap_Exclusions::filter_provider( new stdClass(), 'users' ) instanceof stdClass );
	$check( 'a site can opt back in to product tags', isset( Sitemap_Exclusions::filter_taxonomies( array( 'product_tag' => 1 ) )['product_tag'] ) );
	// The content search runs once, not on every request, and a page change clears it.
	$GLOBALS['t']['filters']['user:sgs_noindex_page_ids'] = array();
	$GLOBALS['t']['transients'] = array();
	$GLOBALS['t']['queries']    = 0;
	Noindex_Store_Pages::noindexed_page_ids();
	Noindex_Store_Pages::noindexed_page_ids();
	Noindex_Store_Pages::noindexed_page_ids();
	$check( 'three sitemap requests run the LIKE on page content once', 1 === $GLOBALS['t']['queries'], (string) $GLOBALS['t']['queries'] );
	foreach ( array( 'save_post_page', 'deleted_post', 'transition_post_status' ) as $hook ) {
		$GLOBALS['t']['queries'] = 0;
		foreach ( $GLOBALS['t']['actions'][ $hook ] ?? array() as $cb ) {
			$cb( 1 );
		}
		Noindex_Store_Pages::noindexed_page_ids();
		$check( 'the cached list is cleared on ' . $hook, 1 === $GLOBALS['t']['queries'], $hook );
	}
	$GLOBALS['t']['pages'][800] = new WP_Post( 800, '<!-- wp:sgs/account /-->' );
	foreach ( $GLOBALS['t']['actions']['save_post_page'] as $cb ) {
		$cb( 800 );
	}
	$check( 'a newly saved account page appears in the list after the clear', in_array( 800, Noindex_Store_Pages::noindexed_page_ids(), true ) );

	// Hidden products.
	$args = Sitemap_Exclusions::exclude_noindexed_pages( array(), 'product' );
	$tq   = $args['tax_query'] ?? array();
	$flat = json_encode( $tq );
	$check( 'the products sitemap leaves out a product hidden from catalogue and search (lacks at least one exclusion term)', false !== strpos( $flat, 'exclude-from-catalog' ) && false !== strpos( $flat, 'exclude-from-search' ) && false !== strpos( $flat, '"OR"' ) && 2 === substr_count( $flat, 'NOT IN' ), $flat );
	$args = Sitemap_Exclusions::exclude_noindexed_pages( array( 'tax_query' => array( array( 'taxonomy' => 'x' ) ) ), 'product' );
	$check( 'an existing tax_query is kept beside the visibility rule', false !== strpos( json_encode( $args['tax_query'] ), '"x"' ) && 'AND' === $args['tax_query']['relation'] );
	$GLOBALS['t']['filters']['user:sgs_noindex_page_ids'] = array( static fn( $ids ) => array_merge( $ids, array( 900 ) ) );
	$check( 'a site can add a page to the noindex list and the sitemap exclusion together', in_array( 900, Noindex_Store_Pages::noindexed_page_ids(), true ) );

	echo "\n==== " . ( $total - $failures ) . ' of ' . $total . ' checks passed (' . $failures . " failed) ====\n";
	exit( $failures > 0 ? 1 : 0 );
}
