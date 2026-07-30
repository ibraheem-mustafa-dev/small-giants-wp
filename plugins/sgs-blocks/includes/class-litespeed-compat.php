<?php
/**
 * SGS LiteSpeed compatibility — keep personalised REST routes out of the
 * server-side page cache.
 *
 * THE PROBLEM (measured live on the sandybrown canary, 2026-07-30)
 * ---------------------------------------------------------------
 * LiteSpeed's page cache sits in FRONT of PHP, so it answers without ever
 * waking WordPress. Its cacheability decision comes from LSCWP's own
 * `X-Litespeed-Cache-Control` header, and LiteSpeed's developer docs state the
 * precedence plainly: "If both headers are set, LiteSpeed Web Server will
 * ignore the value of the Cache-control header and use only the value set by
 * X-Litespeed-Cache-Control." So an endpoint sending a perfectly correct
 * `Cache-Control: no-store` is cached anyway once LSCWP has formed its own
 * opinion. WordPress core's `nocache_headers()` does not help either —
 * WooCommerce already merges those into Store API responses and the bug still
 * happened.
 *
 * LSCWP normally defers to the `DONOTCACHEPAGE` constant, but WooCommerce does
 * not define it on REST requests (confirmed by LiteSpeed's own support staff on
 * the "WC Store API cart is cached" thread), which is exactly why the gap
 * exists. LSCWP's WooCommerce integration auto-excludes the cart/checkout/
 * my-account PAGES — not the Store API ROUTES.
 *
 * TWO REAL FAILURES THIS CLOSES, both measured, not theorised:
 *
 *   1. `/wc/store/v1/cart` — served from cache with a stale empty body, so
 *      `sgs/cart`'s badge (which reads `items_count` from it) was pinned at 0
 *      in every displayMode. Proven by discriminator: in ONE session, one
 *      instant after add-item returned 201 items_count:3, the cached `/cart`
 *      reported 0 while the uncached `/cart/items` reported qty 3. The session
 *      was healthy; only the cached read was blind.
 *
 *   2. `/sgs/v1/product-search` — request 1 miss, request 2 onward HIT. This is
 *      the worse one. That endpoint's security chain (see
 *      class-product-search-rest.php) includes a per-IP rate limit and a
 *      FAIL-CLOSED draft-product visibility filter. A cached response never
 *      wakes PHP, so BOTH are silently bypassed: the rate limiter cannot count
 *      what it never sees, and the visibility filter cannot re-evaluate per
 *      request. A security control that a cache can switch off is not a
 *      control.
 *
 * WHY THIS SHAPE
 * --------------
 * The per-site fix is a LiteSpeed "Do Not Cache URI" entry — which is what
 * LiteSpeed's own support recommends, and it works. It is rejected as the
 * PRIMARY fix because it does not travel with the plugin: every new client site
 * would silently ship a broken cart badge and an unguarded search endpoint
 * until somebody remembered a host-panel setting. This file makes the fix a
 * property of the code instead.
 *
 * `do_action( 'litespeed_control_set_nocache', $reason )` is LSCWP's documented
 * public API. On a non-LiteSpeed host nothing is listening, and `do_action()`
 * on an unregistered hook is a silent no-op — so this is safe to ship
 * unconditionally and changes nothing on nginx/Apache.
 *
 * DELIBERATELY NOT DONE: disabling LiteSpeed's `cache-rest` option globally.
 * It is a per-site setting (same travel problem), community reports show
 * turning it off did NOT fix the underlying staleness anyway, and REST caching
 * is legitimately useful for non-personalised reads. Also not using ESI: it
 * needs LiteSpeed Enterprise or QUIC.cloud and is unsupported on
 * OpenLiteSpeed, so it cannot be a universal default.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

\defined( 'ABSPATH' ) || exit;

/**
 * Marks personalised / rate-limited REST routes as non-cacheable.
 */
class LiteSpeed_Compat {

	/**
	 * Route prefixes that must never be served from a shared page cache.
	 *
	 * Matched against `WP_REST_Request::get_route()`, which is leading-slashed
	 * and namespace-relative (e.g. `/wc/store/v1/cart`).
	 *
	 * `/sgs/v1` is listed WHOLE rather than route-by-route because every route
	 * this plugin registers is either mutating (cart proxy, pack-pricing
	 * apply), rate-limited (product search), or operator-scoped
	 * (pack-pricing preview) — none is a public catalogue read that would
	 * benefit from caching. If a genuinely cacheable public `sgs/v1` route is
	 * added later, narrow this via the filter below rather than deleting it.
	 *
	 * @var string[]
	 */
	private const NOCACHE_ROUTE_PREFIXES = array(
		'/wc/store',
		'/sgs/v1',
	);

	/**
	 * Wire the hooks.
	 *
	 * @return void
	 */
	public static function register() {
		\add_filter( 'rest_pre_dispatch', array( __CLASS__, 'mark_nocache' ), 10, 3 );
	}

	/**
	 * Flag the current REST request non-cacheable when its route is personalised.
	 *
	 * Runs on `rest_pre_dispatch` so it fires before the route callback and
	 * therefore before any response headers are committed — and, critically,
	 * on EVERY matching request rather than only on the ones that happen to
	 * reach a particular controller.
	 *
	 * @param mixed            $result  Response to short-circuit with, or null. Passed through untouched.
	 * @param \WP_REST_Server  $server  Server instance (unused).
	 * @param \WP_REST_Request $request Current request.
	 * @return mixed The unmodified $result — this filter is a side-effect hook, never a short-circuit.
	 */
	public static function mark_nocache( $result, $server, $request ) {
		if ( ! $request instanceof \WP_REST_Request ) {
			return $result;
		}

		$route = (string) $request->get_route();

		/**
		 * Filters the REST route prefixes excluded from server-side page caching.
		 *
		 * @param string[]         $prefixes Leading-slashed, namespace-relative route prefixes.
		 * @param \WP_REST_Request $request  The current request.
		 */
		$prefixes = (array) \apply_filters(
			'sgs_nocache_rest_route_prefixes',
			self::NOCACHE_ROUTE_PREFIXES,
			$request
		);

		foreach ( $prefixes as $prefix ) {
			$prefix = (string) $prefix;
			if ( '' === $prefix || 0 !== strpos( $route, $prefix ) ) {
				continue;
			}

			// LiteSpeed's documented plugin API. No-op when LSCWP is absent.
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Third-party hook we are CALLING, not defining: LSCWP's documented public API (docs.litespeedtech.com/lscache/lscwp/api). An sgs_-prefixed name would be listened to by nothing.
			\do_action(
				'litespeed_control_set_nocache',
				'sgs: personalised or rate-limited REST route (' . $route . ')'
			);

			// The cross-plugin WordPress convention, honoured by LSCWP, WP
			// Rocket, W3TC and others. Covers the cache layers this plugin
			// cannot name. Kept ALONGSIDE the LiteSpeed action rather than
			// instead of it: they address DIFFERENT cache layers, so neither
			// makes the other redundant. Only the LiteSpeed leg is verified on
			// our own canary — the constant is unverified-here coverage.
			if ( ! \defined( 'DONOTCACHEPAGE' ) ) {
				// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- DONOTCACHEPAGE is the shared WordPress cache-plugin convention, not our constant to name. Prefixing it would make every cache plugin ignore it.
				\define( 'DONOTCACHEPAGE', true );
			}

			break;
		}

		return $result;
	}
}
