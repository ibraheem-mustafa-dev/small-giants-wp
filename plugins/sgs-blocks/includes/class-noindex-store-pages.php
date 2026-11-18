<?php
/**
 * Store-page noindex rule (FR-30-9 F3), the one source of "this page is never indexed".
 *
 * A page is a utility surface, and so never indexed, when it is a WooCommerce cart, checkout
 * or account page, a WooCommerce endpoint URL, or any page that holds an `sgs/account` block
 * (the sign-in page is such a page: the block shows its signed-out view there). The rule
 * answers in two places that must agree: the robots meta tag of the request
 * ({@see self::filter_robots()}, through core's `wp_robots` filter, so one tag prints) and the
 * list of page IDs the sitemap leaves out ({@see self::noindexed_page_ids()}, used by
 * {@see Sitemap_Exclusions}). A site adds pages with the `sgs_noindex_page_ids` filter.
 *
 * Money pages are explicitly excluded from noindexing:
 *   front page, shop, single product, product category, product tag.
 *
 * SEC-9 defer on cart/checkout: when an active SEO plugin is detected, cart and checkout
 * defer to it, because it owns robots there. Account pages, account-block pages and WC
 * endpoint URLs are always noindexed regardless (SGS-owned sensitive surfaces, not
 * delegated to any SEO plugin).
 *
 * No-op for the WooCommerce checks when WooCommerce is inactive (`is_cart` function absent).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Noindex_Store_Pages
 *
 * Adds `noindex, nofollow` to the robots meta of WooCommerce utility and account pages.
 */
final class Noindex_Store_Pages {

	/**
	 * Transient holding the ids of pages that hold an `sgs/account` block.
	 *
	 * @var string
	 */
	private const CACHE_KEY = 'sgs_account_block_page_ids';

	/**
	 * Register the `wp_robots` filter.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'wp_robots', array( __CLASS__, 'filter_robots' ), 20 );
		// The sitemap's list of account-block pages is cached; any page change clears it.
		\add_action( 'save_post_page', array( __CLASS__, 'clear_account_block_cache' ) );
		\add_action( 'deleted_post', array( __CLASS__, 'clear_account_block_cache' ) );
		\add_action( 'transition_post_status', array( __CLASS__, 'clear_account_block_cache' ) );
	}

	/**
	 * Add `noindex, nofollow` to the directives core prints, on a utility page.
	 *
	 * Core prints one `<meta name="robots">` tag from this array, so WooCommerce's and this
	 * rule's directives merge into one tag.
	 *
	 * @param array<string,bool|string> $robots Robots directives.
	 * @return array<string,bool|string>
	 */
	public static function filter_robots( $robots ) {
		$robots = (array) $robots;
		if ( self::is_noindex_request() ) {
			$robots['noindex']  = true;
			$robots['nofollow'] = true;
			// WooCommerce adds `follow` on the cart; it must not sit beside `nofollow`.
			unset( $robots['follow'] );
		}
		return $robots;
	}

	/**
	 * Whether the current request is a page that is never indexed.
	 *
	 * @return bool
	 */
	public static function is_noindex_request(): bool {
		if ( \is_admin() ) {
			return false;
		}

		// Never noindex the money pages.
		if ( \is_front_page()
			|| ( \function_exists( 'is_shop' ) && \is_shop() )
			|| ( \function_exists( 'is_product' ) && \is_product() )
			|| ( \function_exists( 'is_product_category' ) && \is_product_category() )
			|| ( \function_exists( 'is_product_tag' ) && \is_product_tag() ) ) {
			return false;
		}

		// A shared wishlist view (?sgs-list=<token>) is a per-visitor, dynamic
		// read of someone else's saved items — never worth indexing, whatever
		// page it happens to render on (FR-30-15).
		if ( self::has_shared_list_param() ) {
			return true;
		}

		// A page that holds the account block (the sign-in page, a custom account page) shows
		// a signed-out form or a signed-in customer's area: never a search result.
		if ( self::is_account_block_page( \get_queried_object() ) ) {
			return true;
		}

		if ( ! \function_exists( 'is_cart' ) ) {
			// WC inactive — nothing more to noindex.
			return false;
		}

		// Account + WC endpoints: noindex regardless of any SEO plugin
		// (SGS-owned sensitive surfaces).
		if ( \is_account_page() || \is_wc_endpoint_url() ) {
			return true;
		}

		// Cart/checkout: may defer to an active SEO plugin (it owns robots there).
		if ( \is_cart() || \is_checkout() ) {
			return ! \SGS\Blocks\Org_Website_Schema::seo_plugin_active();
		}

		return false;
	}

	/**
	 * IDs of the pages that are never indexed, for the sitemap to leave out.
	 *
	 * The WooCommerce cart, checkout and account pages, every page holding an `sgs/account` block,
	 * and whatever the `sgs_noindex_page_ids` filter adds. Unlike the request rule this
	 * includes cart and checkout whatever SEO plugin is active: a utility page has no place in
	 * a sitemap.
	 *
	 * @return int[]
	 */
	public static function noindexed_page_ids(): array {
		$ids = array();

		if ( \function_exists( 'wc_get_page_id' ) ) {
			foreach ( array( 'cart', 'checkout', 'myaccount' ) as $page ) {
				$id = (int) \wc_get_page_id( $page );
				if ( $id > 0 ) {
					$ids[] = $id;
				}
			}
		}

		$ids = array_merge( $ids, self::account_block_page_ids() );

		/**
		 * Filters the pages that are never indexed (robots `noindex` and left out of the sitemap).
		 *
		 * @param int[] $ids Page IDs.
		 */
		$ids = (array) \apply_filters( 'sgs_noindex_page_ids', $ids );
		return \array_values( \array_unique( \array_filter( \array_map( 'intval', $ids ) ) ) );
	}

	/**
	 * IDs of the published pages whose own content holds an `sgs/account` block.
	 *
	 * The search is a `LIKE` on page content, so the answer is kept in a transient and cleared
	 * ({@see self::clear_account_block_cache()}) whenever a page is saved, trashed, restored or deleted.
	 *
	 * @return int[]
	 */
	private static function account_block_page_ids(): array {
		$cached = \get_transient( self::CACHE_KEY );
		if ( \is_array( $cached ) ) {
			return array_map( 'intval', $cached );
		}
		global $wpdb;
		if ( ! isset( $wpdb ) ) {
			return array();
		}
		$ids        = array();
		$candidates = (array) $wpdb->get_col(
			$wpdb->prepare(
				"SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_status = %s AND post_content LIKE %s",
				'page',
				'publish',
				'%' . $wpdb->esc_like( '<!-- wp:sgs/account' ) . '%'
			)
		);
		foreach ( $candidates as $candidate ) {
			if ( self::is_account_block_page( \get_post( (int) $candidate ) ) ) {
				$ids[] = (int) $candidate;
			}
		}
		\set_transient( self::CACHE_KEY, $ids, DAY_IN_SECONDS );
		return $ids;
	}

	/**
	 * Forget the cached account-block page list (a page changed).
	 *
	 * @param mixed $unused Hook argument, not used.
	 * @return void
	 */
	public static function clear_account_block_cache( $unused = null ): void {
		\delete_transient( self::CACHE_KEY );
	}

	/**
	 * Whether a post is a page whose own content holds an `sgs/account` block.
	 *
	 * @param mixed $post The queried object or a post.
	 * @return bool
	 */
	private static function is_account_block_page( $post ): bool {
		return $post instanceof \WP_Post
			&& 'page' === $post->post_type
			&& \has_block( 'sgs/account', $post );
	}

	/**
	 * Whether the current request carries a non-empty `sgs-list` query arg
	 * (a wishlist share-token view, FR-30-15). Read-only — never mutates
	 * the query, never used for anything but this presence check.
	 *
	 * @return bool
	 */
	private static function has_shared_list_param(): bool {
		if ( ! isset( $_GET['sgs-list'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only query-arg check, no state change.
			return false;
		}
		$token = \sanitize_key( \wp_unslash( $_GET['sgs-list'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only query-arg check, no state change.
		return '' !== $token;
	}
}
