<?php
/**
 * SGS Google Merchant Feed — cache + rate-limit layer (FR-27-F2).
 *
 * Extracted from class-product-feed.php so each file stays within the SGS
 * 300-line limit. Owns the two protective layers in front of the feed builder:
 *
 *   Feed cache — full XML in transient 'sgs_merchant_feed_cache'; regenerated
 *                at most hourly; busted on woocommerce_update_product +
 *                save_post_product_variation via delete_transient.
 *   Per-IP RL  — transient 'sgs_mf_rl_{ip_hash}'; 30 req/hour/IP; HTTP 429 on
 *                excess (generous for GMC crawlers; protects the cold-cache
 *                rebuild path from being hammered).
 *
 * No commerce reads happen here — this file never touches prices.
 *
 * @package SGS\Blocks
 * @since   1.15.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Feed_Cache
 *
 * Transient cache + per-IP rate limiting for the Google Merchant feed.
 */
final class Product_Feed_Cache {

	/** Feed transient key. */
	private const FEED_CACHE_KEY = 'sgs_merchant_feed_cache';

	/** Feed cache TTL — 1 hour. */
	private const FEED_CACHE_TTL = \HOUR_IN_SECONDS;

	/** Per-IP rate-limit: max requests per window. */
	private const RL_MAX = 30;

	/** Per-IP rate-limit window in seconds. */
	private const RL_WINDOW = \HOUR_IN_SECONDS;

	/**
	 * Register the cache-bust hooks.
	 *
	 * Bust the feed cache whenever a product or variation is saved so the next
	 * request regenerates with current prices / availability.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'woocommerce_update_product', array( __CLASS__, 'bust' ) );
		\add_action( 'save_post_product_variation', array( __CLASS__, 'bust' ) );
	}

	/**
	 * Read the cached feed XML.
	 *
	 * @return string Cached XML, or '' on miss.
	 */
	public static function get(): string {
		$xml = \get_transient( self::FEED_CACHE_KEY );
		return ( false === $xml ) ? '' : (string) $xml;
	}

	/**
	 * Store the feed XML (1-hour TTL). Empty strings are not cached.
	 *
	 * @param string $xml Full feed XML document.
	 * @return void
	 */
	public static function set( string $xml ): void {
		if ( '' !== $xml ) {
			\set_transient( self::FEED_CACHE_KEY, $xml, self::FEED_CACHE_TTL );
		}
	}

	/**
	 * Delete the cached feed XML.
	 *
	 * @return void
	 */
	public static function bust(): void {
		\delete_transient( self::FEED_CACHE_KEY );
	}

	/**
	 * Per-IP fixed-window rate-limit check.
	 *
	 * Same transient-counter pattern as Product_Authoring_Security::security_chain()
	 * Step 2, keyed by a salted IP hash (raw IP is never stored — privacy-safe).
	 *
	 * @return \WP_Error|null Null on pass, WP_Error with status 429 on excess.
	 */
	public static function check_rate_limit(): ?\WP_Error {
		// Anonymise IP immediately — store a hash, never the raw address.
		$raw_ip  = isset( $_SERVER['REMOTE_ADDR'] )
			? \sanitize_text_field( \wp_unslash( (string) $_SERVER['REMOTE_ADDR'] ) )
			: '';
		$ip_hash = \substr( \md5( $raw_ip . \wp_salt() ), 0, 16 );
		$rl_key  = 'sgs_mf_rl_' . $ip_hash;
		$rl_raw  = \get_transient( $rl_key );
		$now     = \time();

		if ( \is_array( $rl_raw )
			&& isset( $rl_raw['t'], $rl_raw['c'] )
			&& ( $now - (int) $rl_raw['t'] ) < self::RL_WINDOW
		) {
			$count = (int) $rl_raw['c'];
			$start = (int) $rl_raw['t'];
		} else {
			$count = 0;
			$start = $now;
		}

		if ( ( $count + 1 ) > self::RL_MAX ) {
			return new \WP_Error(
				'sgs_rate_limited',
				\__( 'Too many feed requests. Please wait before trying again.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}

		$remaining = \max( 1, self::RL_WINDOW - ( $now - $start ) );
		\set_transient(
			$rl_key,
			array(
				't' => $start,
				'c' => $count + 1,
			),
			$remaining
		);

		return null;
	}
}
