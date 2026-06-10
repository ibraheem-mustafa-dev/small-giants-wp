<?php
/**
 * SGS llms.txt + llms-full.txt handler (FR-27-F2 llms clause, Spec 27 v6).
 *
 * Serves /llms.txt (curated navigation map) and /llms-full.txt (per-product
 * expansion) at the site root in the llmstxt.org shape:
 *   # Site Name
 *   > blockquote summary (brand summary, <200 words)
 *   ## Section
 *   - [Label](URL): one-line description
 *
 * Content-Type: text/plain; charset=utf-8 (NOT text/markdown).
 * X-Robots-Tag: noindex on both files. UTF-8, no BOM.
 *
 * SEC-9 detect-and-defer: if Yoast SEO (which can generate llms.txt from
 * version 25.1) or RankMath is active we do NOT serve — mirror of the pattern
 * at class-product-sitemap.php (fix_lastmod guard).
 *
 * Rate limiting: 60 requests/hour per IP via a transient per hashed IP.
 * Content caching: 6-hour transient; busted on woocommerce_update_product
 * and save_post.
 *
 * Content assembly lives in class-llms-txt-builders.php (navigation map) and
 * class-llms-txt-products.php (per-product expansion) — split solely to keep
 * each file within the SGS 300-line limit.
 *
 * @package SGS\Blocks
 * @since   1.6.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// Own dependencies — a consumer requiring only this file must still resolve
// every class it calls (shared-helper-must-require-its-own-deps).
require_once __DIR__ . '/class-llms-txt-builders.php';
require_once __DIR__ . '/class-llms-txt-products.php';

/**
 * Class Llms_Txt
 *
 * Intercepts requests for /llms.txt and /llms-full.txt and serves plain-text
 * AI navigation files in the llmstxt.org format.
 */
final class Llms_Txt {

	/** Transient key for the curated navigation file content. */
	private const TRANSIENT_SLIM = 'sgs_llms_txt_slim';

	/** Transient key for the full per-product expansion content. */
	private const TRANSIENT_FULL = 'sgs_llms_txt_full';

	/** Content TTL — 6 hours. */
	private const CONTENT_TTL = 6 * \HOUR_IN_SECONDS;

	/** Rate-limit window — 1 hour. */
	private const RATE_WINDOW = \HOUR_IN_SECONDS;

	/** Maximum requests per IP per RATE_WINDOW. */
	private const RATE_LIMIT = 60;

	/**
	 * Register the parse_request intercept and the cache-bust hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		// Use parse_request so we intercept before any WP query runs.
		\add_action( 'parse_request', array( __CLASS__, 'maybe_serve' ) );

		// Bust content caches whenever a product is saved/updated.
		\add_action( 'woocommerce_update_product', array( __CLASS__, 'bust_content_cache' ) );
		// Also bust when a post is saved (covers non-WC pages: privacy, terms, FAQ).
		\add_action( 'save_post', array( __CLASS__, 'bust_content_cache' ) );
	}

	// ── Request intercept ────────────────────────────────────────────────────

	/**
	 * Intercept parse_request and serve the llms file when the path matches.
	 *
	 * @return void
	 */
	public static function maybe_serve(): void {
		$raw_path = isset( $_SERVER['REQUEST_URI'] )
			? \sanitize_text_field( \wp_unslash( $_SERVER['REQUEST_URI'] ) )
			: '';

		// Strip query string so /llms.txt?foo=bar still matches.
		$path = strtok( $raw_path, '?' );

		// Normalise: strip subfolder prefix if WP is installed in a subdirectory.
		$home_path = \wp_parse_url( \home_url(), PHP_URL_PATH );
		if ( $home_path && '/' !== $home_path ) {
			$path = preg_replace(
				'#^' . preg_quote( rtrim( $home_path, '/' ), '#' ) . '#',
				'',
				$path
			);
		}

		if ( '/llms.txt' !== $path && '/llms-full.txt' !== $path ) {
			return;
		}

		// SEC-9: yield to Yoast / RankMath if active (they may serve their own
		// llms.txt — Yoast generates one from 25.1). Mirror of
		// class-product-sitemap.php fix_lastmod guard.
		if ( \defined( 'WPSEO_VERSION' ) || \class_exists( 'RankMath' ) || \defined( 'RANK_MATH_VERSION' ) ) {
			return;
		}

		// Rate limiting.
		if ( ! self::check_rate_limit() ) {
			\status_header( 429 );
			header( 'Content-Type: text/plain; charset=utf-8' );
			header( 'Retry-After: 3600' );
			echo 'Rate limit exceeded. Please retry after 1 hour.';
			exit;
		}

		$is_full = ( '/llms-full.txt' === $path );
		$content = $is_full ? self::get_full_content() : self::get_slim_content();

		\status_header( 200 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );
		header( 'Cache-Control: public, max-age=21600' );
		// Plain-text output, UTF-8 no BOM.
		echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- plain text file, no HTML context; titles are control-char-stripped at build time.
		exit;
	}

	// ── Rate limiting ────────────────────────────────────────────────────────

	/**
	 * Check and increment the per-IP rate limit counter.
	 *
	 * Returns true when the request is within the limit, false when it should
	 * be rejected. Uses a transient keyed by a salted SHA-1 of the client IP
	 * so no raw IP is stored in wp_options.
	 *
	 * @return bool
	 */
	private static function check_rate_limit(): bool {
		$raw_ip = isset( $_SERVER['REMOTE_ADDR'] )
			? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
			: 'unknown';

		$key     = 'sgs_llms_rl_' . substr( sha1( \wp_salt( 'auth' ) . $raw_ip ), 0, 16 );
		$current = (int) \get_transient( $key );

		if ( $current >= self::RATE_LIMIT ) {
			return false;
		}

		\set_transient( $key, $current + 1, self::RATE_WINDOW );
		return true;
	}

	// ── Cache ────────────────────────────────────────────────────────────────

	/**
	 * Delete both content transients.
	 *
	 * Hooked to woocommerce_update_product and save_post.
	 *
	 * @return void
	 */
	public static function bust_content_cache(): void {
		\delete_transient( self::TRANSIENT_SLIM );
		\delete_transient( self::TRANSIENT_FULL );
	}

	/**
	 * Return the cached or freshly built slim llms.txt content.
	 *
	 * @return string
	 */
	private static function get_slim_content(): string {
		$cached = \get_transient( self::TRANSIENT_SLIM );
		if ( false !== $cached && is_string( $cached ) ) {
			return $cached;
		}

		$content = Llms_Txt_Builders::build_slim();
		\set_transient( self::TRANSIENT_SLIM, $content, self::CONTENT_TTL );
		return $content;
	}

	/**
	 * Return the cached or freshly built full llms-full.txt content.
	 *
	 * @return string
	 */
	private static function get_full_content(): string {
		$cached = \get_transient( self::TRANSIENT_FULL );
		if ( false !== $cached && is_string( $cached ) ) {
			return $cached;
		}

		// Single-flight rebuild lock — the full build walks every product's
		// manifest; concurrent cold-cache requests must not stampede it.
		// Losers fall back to the cheap slim content for this one response.
		if ( false !== \get_transient( 'sgs_llms_full_building' ) ) {
			return self::get_slim_content();
		}
		\set_transient( 'sgs_llms_full_building', 1, 60 );
		$content = Llms_Txt_Products::build_full();
		\set_transient( self::TRANSIENT_FULL, $content, self::CONTENT_TTL );
		\delete_transient( 'sgs_llms_full_building' );
		return $content;
	}
}
