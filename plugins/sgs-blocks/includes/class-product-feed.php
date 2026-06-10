<?php
/**
 * SGS Google Merchant Feed — REST endpoint (FR-27-F2).
 *
 * Registers GET /sgs/v1/merchant-feed and serves an RSS 2.0 + Google Merchant
 * namespace XML document containing one <item> per variation of every eligible
 * WooCommerce variable product.
 *
 * Endpoint type — REST route with permission_callback '__return_true' (public
 * by design; GMC fetchers are anonymous crawlers). The WP REST API normally
 * forces JSON; we intercept via rest_pre_serve_request to echo raw XML and
 * return true so the REST dispatcher does not write its own body.
 *
 * Caching + rate-limiting live in class-product-feed-cache.php; the per-item
 * XML builder + pure helpers live in class-product-feed-items.php (SGS
 * 300-line limit split).
 *
 * SEC-1 compliance: ALL commerce values (price, availability, GTIN) come ONLY
 * from Product_Manifest::build(). This file contains NEITHER wc_get_price_to_display
 * NOR get_children — same CI grep discipline as class-product-schema.php.
 * <!-- CI_GREP_ASSERT: merchant_feed_never_reads_wc_price_or_children -->
 *
 * @package SGS\Blocks
 * @since   1.15.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// Own deps — require_once is idempotent; safe if already loaded by sgs-blocks.php.
require_once __DIR__ . '/class-product-manifest.php';
require_once __DIR__ . '/class-product-schema.php';
require_once __DIR__ . '/class-product-feed-items.php';
require_once __DIR__ . '/class-product-feed-channel.php';
require_once __DIR__ . '/class-product-feed-cache.php';

/**
 * Class Product_Feed
 *
 * Registers and serves the Google Merchant Center RSS 2.0 feed.
 */
final class Product_Feed {

	/**
	 * Hard cap per feed build — an unbounded loop with per-product manifest
	 * builds exhausts memory at catalogue scale; beyond this, paginate.
	 *
	 * @var int
	 */
	const MAX_FEED_PRODUCTS = 2000;

	/**
	 * Register the REST route and the cache layer's bust hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
		Product_Feed_Cache::register();
	}

	/**
	 * Register GET /sgs/v1/merchant-feed.
	 *
	 * @return void
	 */
	public static function register_route(): void {
		\register_rest_route(
			'sgs/v1',
			'/merchant-feed',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => '__return_true', // Public — GMC crawlers are anonymous.
			)
		);
	}

	/**
	 * REST callback — serve the XML feed.
	 *
	 * Hooks rest_pre_serve_request to echo raw XML so the REST dispatcher
	 * never writes its own JSON body.
	 *
	 * @param \WP_REST_Request $request Incoming REST request (unused; kept for
	 *                                  signature compatibility with register_rest_route).
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- $request required by register_rest_route callback signature.
		// ── Per-IP rate limit ─────────────────────────────────────────────────
		$rl_error = Product_Feed_Cache::check_rate_limit();
		if ( null !== $rl_error ) {
			return $rl_error;
		}

		// ── Feed-level cache (regenerate at most hourly) ──────────────────────
		$xml = Product_Feed_Cache::get();
		if ( '' === $xml ) {
			// Single-flight lock — concurrent cold-cache requests must not
			// stampede the full build; losers serve an empty well-formed feed.
			if ( false === \get_transient( 'sgs_feed_building' ) ) {
				\set_transient( 'sgs_feed_building', 1, 60 );
				$xml = self::build_feed();
				Product_Feed_Cache::set( $xml );
				\delete_transient( 'sgs_feed_building' );
			}
		}

		if ( '' === $xml ) {
			// No eligible products — serve a well-formed empty feed.
			$xml = Product_Feed_Channel::wrap_channel( '' );
		}

		// ── Intercept REST output — serve raw XML ─────────────────────────────
		// rest_pre_serve_request fires just before the dispatcher writes the body.
		// Returning true signals the body is already sent; dispatcher writes nothing.
		$captured_xml = $xml;
		\add_filter(
			'rest_pre_serve_request',
			static function ( $served ) use ( $captured_xml ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- $served required by rest_pre_serve_request filter signature.
				if ( ! \headers_sent() ) {
					\header( 'Content-Type: application/xml; charset=utf-8' );
					\header( 'X-Robots-Tag: noindex' );
					\header( 'Cache-Control: public, max-age=3600' );
				}
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- XML is builder-generated; every value escaped via Product_Feed_Items::xml_esc().
				echo $captured_xml;
				return true;
			}
		);

		return new \WP_REST_Response( null, 200 );
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * Build the complete feed XML string.
	 *
	 * Iterates all published, non-password, catalog-visible variable products
	 * that have a usable manifest. Per-product outer loop; per-combo inner loop
	 * delegates to Product_Feed_Items::build_item().
	 *
	 * @return string Full XML document, or '' if no eligible products exist.
	 */
	private static function build_feed(): string {
		if ( ! \function_exists( 'wc_get_products' ) ) {
			return '';
		}

		$product_ids = \wc_get_products(
			array(
				'type'       => 'variable',
				'status'     => 'publish',
				// 'catalog' excludes hidden AND search-only products — a search-only
				// product leaking into this PUBLIC feed was a red-team BLOCK finding.
				'visibility' => 'catalog',
				'limit'      => self::MAX_FEED_PRODUCTS,
				'return'     => 'ids',
				'orderby'    => 'date',
				'order'      => 'DESC',
			)
		);

		if ( empty( $product_ids ) ) {
			return '';
		}

		$items_xml = '';

		foreach ( $product_ids as $pid ) {
			$product_id = (int) $pid;

			// Raw post_password read, NOT post_password_required() — that one is
			// cookie/session-dependent, wrong for a public endpoint.
			$post = \get_post( $product_id );
			if ( ! $post || '' !== $post->post_password ) {
				continue;
			}

			$product = \wc_get_product( $product_id );
			if ( ! $product ) {
				continue;
			}
			// Belt-and-braces visibility re-check on the loaded object.
			if ( ! \in_array( $product->get_catalog_visibility(), array( 'visible', 'catalog' ), true ) ) {
				continue;
			}

			// SEC-1: manifest is the ONLY price/availability source.
			$manifest = Product_Manifest::build( $product_id );
			if ( null === $manifest || empty( $manifest['combos'] ) ) {
				continue;
			}

			// g:item_group_id MUST be byte-identical to the on-page schema's
			// productGroupID — single shared call site, never a duplicated rule.
			$group_id = Product_Schema::product_group_id( $product, $product_id );

			$permalink = \esc_url_raw( (string) \get_permalink( $product_id ) );

			// Parent name and description (plain text; wp_strip_all_tags per FR-27-F2).
			$parent_name = \trim( \sanitize_text_field( \wp_strip_all_tags( $product->get_name() ) ) );
			$raw_desc    = $product->get_short_description();
			if ( '' === \trim( \wp_strip_all_tags( $raw_desc ) ) ) {
				$raw_desc = $product->get_description();
			}
			$parent_desc = \trim( \wp_strip_all_tags( $raw_desc ) );

			// Brand — first-hit: product_brand taxonomy → 'brand' attribute → site name.
			$brand = Product_Feed_Channel::resolve_brand( $product );

			// Pre-build term-label lookup from manifest axes (taxonomy → slug → label).
			$term_labels = array();
			$axes        = \is_array( $manifest['axes'] ?? null ) ? $manifest['axes'] : array();
			foreach ( $axes as $axis ) {
				$tax = $axis['taxonomy'];
				foreach ( $axis['terms'] as $term ) {
					$term_labels[ $tax ][ $term['slug'] ] = $term['label'];
				}
			}

			// Per-combo: build one <item> per variation.
			foreach ( $manifest['combos'] as $combo_key => $combo ) {
				if ( ! \is_array( $combo ) || ! isset( $combo['incMinor'] ) ) {
					continue;
				}

				// Parse combo_key → taxonomy:slug pairs for title suffix and URL building.
				$combo_attrs = array();
				foreach ( \explode( '|', (string) $combo_key ) as $part ) {
					$colon = \strpos( $part, ':' );
					if ( false !== $colon ) {
						$combo_attrs[ \substr( $part, 0, $colon ) ] = \substr( $part, $colon + 1 );
					}
				}

				$items_xml .= Product_Feed_Items::build_item(
					$product_id,
					$combo,
					$manifest,
					$parent_name,
					$parent_desc,
					$brand,
					$combo_attrs,
					$term_labels,
					$permalink,
					$group_id
				);
			}
		}

		return Product_Feed_Channel::wrap_channel( $items_xml );
	}
}
