<?php
/**
 * Store-page noindex emitter (FR-30-9 F3).
 *
 * Emits `<meta name="robots" content="noindex,nofollow">` on WooCommerce
 * utility surfaces (account pages, WC endpoint URLs, cart, checkout) that
 * must never be indexed.
 *
 * Money pages are explicitly excluded from noindexing:
 *   front page, shop, single product, product category, product tag.
 *
 * SEC-9 defer on cart/checkout: when an active SEO plugin is detected, this
 * emitter defers on cart/checkout only — the SEO plugin owns robots there.
 * Account pages + WC endpoint URLs are always noindexed regardless (SGS-owned
 * sensitive surfaces, not delegated to any SEO plugin).
 *
 * No-op when WooCommerce is inactive (`is_cart` function absent).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Noindex_Store_Pages
 *
 * Emits a noindex robots meta tag on WooCommerce utility/sensitive pages.
 */
final class Noindex_Store_Pages {

	/**
	 * Register the wp_head hook (priority 1 — before SEO plugins, before theme).
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_head', array( __CLASS__, 'emit' ), 1 );
	}

	/**
	 * Emit `<meta name="robots" content="noindex,nofollow">` on utility pages.
	 *
	 * @return void
	 */
	public static function emit(): void {
		if ( \is_admin() ) {
			return;
		}

		// Never noindex the money pages.
		if ( \is_front_page()
			|| ( \function_exists( 'is_shop' ) && \is_shop() )
			|| ( \function_exists( 'is_product' ) && \is_product() )
			|| ( \function_exists( 'is_product_category' ) && \is_product_category() )
			|| ( \function_exists( 'is_product_tag' ) && \is_product_tag() ) ) {
			return;
		}

		// A shared wishlist view (?sgs-list=<token>) is a per-visitor, dynamic
		// read of someone else's saved items — never worth indexing, whatever
		// page it happens to render on (FR-30-15).
		if ( self::has_shared_list_param() ) {
			echo '<meta name="robots" content="noindex,nofollow">' . "\n";
			return;
		}

		if ( ! \function_exists( 'is_cart' ) ) {
			// WC inactive — nothing to noindex.
			return;
		}

		// Account + WC endpoints: noindex regardless of any SEO plugin
		// (SGS-owned sensitive surfaces).
		if ( \is_account_page() || \is_wc_endpoint_url() ) {
			echo '<meta name="robots" content="noindex,nofollow">' . "\n";
			return;
		}

		// Cart/checkout: may defer to an active SEO plugin (it owns robots there).
		if ( \is_cart() || \is_checkout() ) {
			if ( \SGS\Blocks\Org_Website_Schema::seo_plugin_active() ) {
				return;
			}
			echo '<meta name="robots" content="noindex,nofollow">' . "\n";
		}
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
