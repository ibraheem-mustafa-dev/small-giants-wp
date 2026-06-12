<?php
/**
 * SGS Product Search — REST controller for GET /sgs/v1/product-search.
 *
 * Returns product suggestions (title + thumbnail + permalink + id only) for a
 * guest search query.  Zero data leakage is the primary security invariant:
 * this codebase shipped a draft-product leak before (merchant feed); a repeat
 * is unacceptable.
 *
 * Security chain (in handler order):
 *   1. Global circuit breaker — site-wide ceiling, pre-DB, cheap.
 *   2. Per-IP rate limit     — fixed-window anchor (M4/BUG2 pattern).
 *   3. Input length guards   — 2–64 chars UTF-8.
 *   4. Visibility tax_query  — FAIL CLOSED: 503 if $exclude is empty.
 *   5. Single WP_Query       — no custom posts_where, no global hook.
 *   6. Result-level re-gate  — defence in depth; near-miss canary log.
 *   7. PHP prefix sort       — prefix-match floats, tie-break title ASC, cap 10.
 *   8. Fixed response shape  — {id, title, permalink, thumbnail} only.
 *   9. Cache-Control headers — no-store on every response path.
 *
 * Wiring: required + ::register() called directly in SGS_Blocks::__construct(),
 * mirroring the Cart_Proxy pattern in class-sgs-blocks.php.  This class has no
 * file-scope WC dependency (no `extends WC_*`) so it is safe to require at
 * constructor time, exactly like Cart_Proxy.  All WC function calls happen
 * inside the REST handler, which only executes after rest_api_init — well
 * after woocommerce_loaded has fired.
 *
 * @package SGS\Blocks
 * @since   1.15.0
 * @see     reports/FR-30-5-search-design.md — build contract
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Search_REST
 *
 * Registers GET /sgs/v1/product-search.
 */
final class Product_Search_REST {

	// ── Tunable constants (change ONE place to adjust limits) ─────────────────

	/**
	 * Site-wide requests-per-minute ceiling (global circuit breaker).
	 * Protects against botnets and shared-IP amplification attacks.
	 * This is the real backstop; per-IP is a speed-bump.
	 *
	 * @var int
	 */
	const GLOBAL_MAX = 2000;

	/**
	 * Per-IP requests per window (speed-bump layer).
	 *
	 * @var int
	 */
	const PER_IP_MAX = 30;

	/**
	 * Rate-limit window in seconds (fixed window for both layers).
	 *
	 * @var int
	 */
	const WINDOW = 60;

	/**
	 * Minimum query length in UTF-8 characters.
	 *
	 * @var int
	 */
	const MIN_LEN = 2;

	/**
	 * Maximum query length in UTF-8 characters.
	 *
	 * @var int
	 */
	const MAX_LEN = 64;

	/**
	 * Maximum results returned to the client after sorting + cap.
	 *
	 * @var int
	 */
	const RESULT_CAP = 10;

	/** REST namespace. */
	const REST_NAMESPACE = 'sgs/v1';

	/** REST route (without leading slash). */
	const REST_ROUTE = 'product-search';

	// ── Wiring ────────────────────────────────────────────────────────────────

	/**
	 * Wire WordPress hooks.  Called once from the woocommerce_loaded callback
	 * in class-sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );

		// Attach Cache-Control: no-store to every response on this route.
		// Scoped to our namespace so we do not pollute the global REST stack.
		\add_filter( 'rest_post_dispatch', array( __CLASS__, 'add_no_store_header' ), 10, 3 );
	}

	// ── REST route ────────────────────────────────────────────────────────────

	/**
	 * Register GET /sgs/v1/product-search.
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				// Public search endpoint — the handler enforces rate-limiting and
				// visibility filtering; no authentication required.
				'permission_callback' => '__return_true',
				'args'                => array(
					'q' => array(
						'required'          => true,
						'description'       => \__( 'Search query string.', 'sgs-blocks' ),
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => static function ( $value ) {
							// Reject non-strings early so the handler only sees strings.
							// Length is re-checked after sanitisation in the handler.
							return is_string( $value );
						},
					),
				),
			)
		);
	}

	// ── Cache-Control filter ──────────────────────────────────────────────────

	/**
	 * Add Cache-Control: no-store to every response served by this route.
	 *
	 * Scoped by route path so we do not affect unrelated endpoints.
	 * Called on rest_post_dispatch (fires after the handler returns).
	 *
	 * @param \WP_REST_Response $result  The response about to be served.
	 * @param \WP_REST_Server   $server  REST server instance.
	 * @param \WP_REST_Request  $request The current request.
	 * @return \WP_REST_Response
	 */
	public static function add_no_store_header(
		$result,
		$server, // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		$request
	) {
		if ( false !== strpos( (string) $request->get_route(), '/' . self::REST_NAMESPACE . '/' . self::REST_ROUTE ) ) {
			$result->header( 'Cache-Control', 'no-store, no-cache, must-revalidate' );

			// On a rate-limit / circuit-breaker error, emit Retry-After.
			// WP converts the handler's WP_Error into a WP_REST_Response before
			// rest_post_dispatch, so the registered error data lives under the
			// 'data' key of get_data() (e.g. ['code'=>..., 'data'=>['status'=>429,
			// 'retryAfter'=>N]]).
			$data = $result->get_data();
			if ( is_array( $data ) && isset( $data['data']['retryAfter'] ) ) {
				$result->header( 'Retry-After', (string) (int) $data['data']['retryAfter'] );
			}
		}
		return $result;
	}

	// ── Handler ───────────────────────────────────────────────────────────────

	/**
	 * Handle GET /sgs/v1/product-search.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {

		// ── Step 1: Global circuit breaker (pre-DB, cheap) ───────────────────
		// Fixed-window minute bucket keyed on the current minute floor.
		// This is the real backstop against botnet / shared-IP amplification.
		// Per-IP below is a secondary speed-bump.
		$minute_bucket = (int) floor( time() / self::WINDOW );
		$global_key    = 'sgs_psearch_global_' . $minute_bucket;
		$global_count  = (int) \get_transient( $global_key );

		if ( $global_count >= self::GLOBAL_MAX ) {
			return new \WP_Error(
				'sgs_search_busy',
				\__( 'Search is temporarily unavailable. Please try again shortly.', 'sgs-blocks' ),
				array(
					'status'     => 503,
					'retryAfter' => self::WINDOW,
				)
			);
		}

		// Increment global counter for this minute bucket.
		// TTL = window so the transient auto-expires; we use fixed bucket keys so
		// incrementing does NOT slide the window (M4/BUG2 fix pattern).
		\set_transient( $global_key, $global_count + 1, self::WINDOW );

		// ── Step 2: Per-IP rate limit ─────────────────────────────────────────
		// NOTE: On Hostinger hcdn, HTTP_X_REAL_IP is the real visitor IP; there
		// is no Cloudflare (HTTP_CF_CONNECTING_IP is unset).  The global circuit
		// breaker above is the authoritative backstop; per-IP is a speed-bump
		// and is still worth having to slow individual bad actors.
		$client_ip = self::sgs_search_client_ip();
		$ip_hash   = md5( $client_ip );
		$ip_rl_key = 'sgs_psearch_rl_' . $ip_hash;
		$ip_rl_raw = \get_transient( $ip_rl_key );
		$now       = time();

		if ( is_array( $ip_rl_raw )
			&& isset( $ip_rl_raw['start'], $ip_rl_raw['count'] )
			&& ( $now - (int) $ip_rl_raw['start'] ) < self::WINDOW
		) {
			$ip_count = (int) $ip_rl_raw['count'];
			$ip_start = (int) $ip_rl_raw['start'];
		} else {
			// No active window or window elapsed — start a fresh one.
			$ip_count = 0;
			$ip_start = $now;
		}

		if ( $ip_count >= self::PER_IP_MAX ) {
			$retry_after = max( 1, self::WINDOW - ( $now - $ip_start ) );
			return new \WP_Error(
				'sgs_search_rate_limited',
				\__( 'Too many search requests. Please wait before trying again.', 'sgs-blocks' ),
				array(
					'status'     => 429,
					'retryAfter' => $retry_after,
				)
			);
		}

		// Increment within the fixed window — anchor the start timestamp so
		// set_transient cannot slide the window forward (mirrors M4/BUG2 fix
		// in class-cart-proxy.php).
		$ip_remaining = max( 1, self::WINDOW - ( $now - $ip_start ) );
		\set_transient(
			$ip_rl_key,
			array(
				'start' => $ip_start,
				'count' => $ip_count + 1,
			),
			$ip_remaining
		);

		// ── Step 3: Input length guards ───────────────────────────────────────
		// $q has already been through sanitize_text_field via the arg callback.
		$q = trim( (string) $request->get_param( 'q' ) );

		if ( mb_strlen( $q, 'UTF-8' ) < self::MIN_LEN ) {
			return new \WP_Error(
				'sgs_search_too_short',
				\__( 'Search query must be at least 2 characters.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		if ( mb_strlen( $q, 'UTF-8' ) > self::MAX_LEN ) {
			return new \WP_Error(
				'sgs_search_too_long',
				\__( 'Search query must be 64 characters or fewer.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		// ── Step 4: Visibility exclusion — FAIL CLOSED ───────────────────────
		// If wc_get_product_visibility_term_ids() is unavailable or returns an
		// empty exclusion set, we MUST refuse to run an unfiltered query.
		// An empty NOT IN clause would match all products including hidden ones.
		if ( ! function_exists( 'wc_get_product_visibility_term_ids' ) ) {
			return new \WP_Error(
				'sgs_search_unavailable',
				\__( 'Product search is temporarily unavailable.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		$vis     = wc_get_product_visibility_term_ids();
		$exclude = array_filter( array( $vis['exclude-from-search'] ?? 0 ) );

		// Also exclude out-of-stock products when the WooCommerce setting is on.
		if ( 'yes' === \get_option( 'woocommerce_hide_out_of_stock_items' )
			&& ! empty( $vis['outofstock'] )
		) {
			$exclude[] = (int) $vis['outofstock'];
		}

		// FAIL CLOSED: if $exclude is empty something is wrong (WC term IDs not
		// resolved), so we refuse to run an unfiltered query that could expose
		// hidden products.
		if ( empty( $exclude ) ) {
			return new \WP_Error(
				'sgs_search_unavailable',
				\__( 'Product search is temporarily unavailable.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		$tax_query = array(
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'term_taxonomy_id',
				'terms'    => array_map( 'intval', $exclude ),
				'operator' => 'NOT IN',
			),
		);

		// ── Step 5: Single WP_Query (no custom posts_where) ──────────────────
		// post_status is a string literal 'publish', never an array — pinned to
		// prevent accidental broadening to ['publish', 'draft'] in future edits.
		// no_found_rows + update_*_cache = false keep this cheap (< 150 ms gate).
		$t_start = microtime( true );

		$query = new \WP_Query(
			array(
				'post_type'              => 'product',
				'post_status'            => 'publish', // STRING not array — intentional; do not change.
				'has_password'           => false,
				's'                      => $q,
				'fields'                 => 'ids',
				'posts_per_page'         => 20, // Over-fetch; capped to RESULT_CAP after sort.
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				'tax_query'              => $tax_query, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				'ignore_sticky_posts'    => true,
			)
		);

		$elapsed_ms = round( ( microtime( true ) - $t_start ) * 1000 );

		$candidate_ids = $query->posts;

		// ── Step 6: Result-level re-gate (defence in depth) ──────────────────
		// Re-validate every id independently. If a product slips through the
		// query layer this catch logs a near-miss so we know the query filter
		// missed something — an active canary for correctness.
		$near_miss_logged = false;
		$survivors        = array();

		foreach ( $candidate_ids as $id ) {
			$id = (int) $id;

			// Publish-status — belt-and-braces (WP_Query already filters, but
			// ensures a race-condition status change between query and hydration).
			if ( 'publish' !== \get_post_status( $id ) ) {
				if ( ! $near_miss_logged ) {
					\error_log( // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
						sprintf(
							'[SGS Search] Near-miss canary: post %d passed WP_Query but failed get_post_status check. Query-level filter may have missed this product.',
							$id
						)
					);
					$near_miss_logged = true;
				}
				continue;
			}

			// Password protection.
			if ( \post_password_required( $id ) ) {
				continue;
			}

			// WooCommerce visibility (is_visible() checks exclude-from-catalog,
			// exclude-from-search, and the outofstock setting coherently).
			$product = \wc_get_product( $id );
			if ( ! $product || ! $product->is_visible() ) {
				if ( $product && ! $near_miss_logged ) {
					\error_log( // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
						sprintf(
							'[SGS Search] Near-miss canary: post %d passed WP_Query but failed is_visible() check. Query-level filter may have missed this product.',
							$id
						)
					);
					$near_miss_logged = true;
				}
				continue;
			}

			$survivors[] = $id;
		}

		// ── Step 7: PHP prefix sort + cap ─────────────────────────────────────
		// Titles whose lowercased value starts with the lowercased query float
		// to the top. Ties are broken by post_title ASC (case-insensitive).
		$q_lower = mb_strtolower( $q, 'UTF-8' );

		usort(
			$survivors,
			static function ( $a, $b ) use ( $q_lower ) {
				$title_a  = mb_strtolower( \get_the_title( $a ), 'UTF-8' );
				$title_b  = mb_strtolower( \get_the_title( $b ), 'UTF-8' );
				$prefix_a = str_starts_with( $title_a, $q_lower ) ? 0 : 1;
				$prefix_b = str_starts_with( $title_b, $q_lower ) ? 0 : 1;

				if ( $prefix_a !== $prefix_b ) {
					return $prefix_a - $prefix_b;
				}

				return strcmp( $title_a, $title_b );
			}
		);

		$survivors = array_slice( $survivors, 0, self::RESULT_CAP );

		// ── Step 8: Build fixed response ──────────────────────────────────────
		// Response shape is FIXED: {id, title, permalink, thumbnail}.
		// No price / meta / stock / variation data — ever.
		// title is decoded + stripped so the client can render via textContent
		// safely (XSS inert even if injected into innerHTML by mistake).
		$out = array();

		foreach ( $survivors as $id ) {
			$thumbnail = \get_the_post_thumbnail_url( $id, 'woocommerce_thumbnail' );
			if ( ! $thumbnail ) {
				$thumbnail = \wc_placeholder_img_src( 'woocommerce_thumbnail' );
			}

			$out[] = array(
				'id'        => (int) $id,
				'title'     => \wp_strip_all_tags( \html_entity_decode( \get_the_title( $id ), ENT_QUOTES, 'UTF-8' ) ),
				'permalink' => \get_permalink( $id ),
				'thumbnail' => (string) $thumbnail,
			);
		}

		// ── Step 9: Return response with timing header ─────────────────────────
		// Cache-Control: no-store is applied by the add_no_store_header filter
		// (registered in ::register()) — covers both success and error responses.
		$response = new \WP_REST_Response( array( 'results' => $out ), 200 );
		$response->header( 'X-SGS-Search-Ms', (string) $elapsed_ms );

		return $response;
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	/**
	 * Resolve the real client IP for rate-limiting.
	 *
	 * Resolution order (Hostinger hcdn environment):
	 *   1. HTTP_X_REAL_IP  — hcdn sets this to the visitor's real IP.
	 *   2. Last comma-segment of HTTP_X_FORWARDED_FOR — trustworthy on hcdn as
	 *      the CDN appends the real IP; we take the LAST segment to avoid
	 *      client-spoofed leading IPs.
	 *   3. REMOTE_ADDR     — last resort (the hcdn edge node, not the visitor).
	 *
	 * NOTE: On hcdn there is no Cloudflare (HTTP_CF_CONNECTING_IP is unset).
	 * We do NOT trust the raw client-supplied X-Forwarded-For chain blindly —
	 * the global circuit breaker is the authoritative backstop; this per-IP
	 * limiter is a secondary speed-bump against individual bad actors.
	 *
	 * For IPv6 addresses we bucket by the /64 prefix (first 4 hextets) before
	 * hashing, so a single /64 cannot trivially rotate through addresses to
	 * evade the per-IP limit.
	 *
	 * @return string md5-hashed IP identifier (no raw IP stored in transient keys).
	 */
	private static function sgs_search_client_ip(): string {
		$raw_ip = '';

		// 1. HTTP_X_REAL_IP (hcdn sets this — most reliable on this host).
		if ( ! empty( $_SERVER['HTTP_X_REAL_IP'] ) ) {
			$candidate = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_REAL_IP'] ) );
			if ( filter_var( $candidate, FILTER_VALIDATE_IP ) ) {
				$raw_ip = $candidate;
			}
		}

		// 2. Last comma-segment of HTTP_X_FORWARDED_FOR.
		if ( '' === $raw_ip && ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$fwd_raw   = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) );
			$fwd_parts = array_map( 'trim', explode( ',', $fwd_raw ) );
			$last_seg  = end( $fwd_parts );
			if ( filter_var( $last_seg, FILTER_VALIDATE_IP ) ) {
				$raw_ip = $last_seg;
			}
		}

		// 3. REMOTE_ADDR fallback (hcdn edge node — not visitor IP, but better
		// than nothing for the speed-bump layer).
		if ( '' === $raw_ip && ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
			$candidate = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
			if ( filter_var( $candidate, FILTER_VALIDATE_IP ) ) {
				$raw_ip = $candidate;
			}
		}

		if ( '' === $raw_ip ) {
			$raw_ip = 'unknown';
		}

		// IPv6 /64 bucketing: expand and take the first 4 hextets (64 bits).
		// This prevents a single /64 range from trivially rotating IPs.
		if ( false !== strpos( $raw_ip, ':' ) ) {
			$expanded = self::expand_ipv6( $raw_ip );
			if ( '' !== $expanded ) {
				// Split into 8 hextets, take first 4 for the /64 prefix.
				$hextets = explode( ':', $expanded );
				$raw_ip  = implode( ':', array_slice( $hextets, 0, 4 ) ) . '::/64';
			}
		}

		// Return md5 hash — raw IP is never stored in transient keys.
		return md5( $raw_ip );
	}

	/**
	 * Expand an IPv6 address to its full 8-hextet form.
	 *
	 * Returns the expanded string, or '' on failure.
	 *
	 * @param string $ip IPv6 address string (may be abbreviated).
	 * @return string
	 */
	private static function expand_ipv6( string $ip ): string {
		$packed = inet_pton( $ip );
		if ( false === $packed ) {
			return '';
		}
		// inet_pton returns 16 raw bytes for IPv6; unpack as 8 × 16-bit big-endian.
		$unpacked = unpack( 'n8', $packed );
		if ( ! is_array( $unpacked ) || 8 !== count( $unpacked ) ) {
			return '';
		}
		return implode(
			':',
			array_map(
				static function ( $n ) {
					return sprintf( '%04x', $n );
				},
				$unpacked
			)
		);
	}
}
