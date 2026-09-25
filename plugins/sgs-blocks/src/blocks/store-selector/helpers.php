<?php
/**
 * Helpers for sgs/store-selector.
 *
 * Every function is guarded with function_exists() because render.php
 * require_once's this file, and require_once alone does not protect against
 * a second, independent require of the SAME path resolved two different
 * ways (relative vs realpath) — the guard is what actually stops a fatal
 * "cannot redeclare" on a page rendering two instances of this block, or a
 * test harness that includes this file directly.
 *
 * No top-level function declarations live in render.php itself (a top-level
 * function in a render.php fatals the page at the second instance —
 * see MEMORY.md's no-top-level-function-in-per-render-php lesson); every
 * helper this block needs lives here instead.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_store_selector_match' ) ) {
	/**
	 * Pick the "current store" from a list of {label, url, flagId, flagUrl}
	 * entries, given the visitor's request host and path.
	 *
	 * Matching rule (design note, U-12 §C):
	 *   1. Only stores whose URL host equals the request host are candidates.
	 *   2. Among those, the one whose URL PATH is the LONGEST prefix of the
	 *      request path wins (an exact path match is simply the longest
	 *      possible prefix, so it always wins over a shorter one).
	 *   3. If nothing matches (no candidate, or no stores at all), the
	 *      response is the first store — or null when $stores is empty.
	 *
	 * Deliberately uses PHP's native parse_url() (not wp_parse_url()) so this
	 * function has zero WordPress dependency and is directly unit-testable
	 * from a bare `php` CLI run with no bootstrap. render.php still sanitises
	 * $_SERVER input with WordPress helpers before calling in — this function
	 * only ever sees already-sanitised strings.
	 *
	 * @param array<int,array<string,mixed>> $stores       Repeater rows.
	 * @param string                         $request_host Lower-cased host, no port.
	 * @param string                         $request_path Path beginning with '/'.
	 * @return array<string,mixed>|null The matched store row, or null when
	 *                                  $stores is empty.
	 */
	function sgs_store_selector_match( array $stores, string $request_host, string $request_path ) {
		if ( empty( $stores ) ) {
			return null;
		}

		$request_host = strtolower( trim( $request_host ) );
		if ( '' === $request_path ) {
			$request_path = '/';
		}

		$best     = null;
		$best_len = -1;

		foreach ( $stores as $store ) {
			if ( ! is_array( $store ) ) {
				continue;
			}
			$url = isset( $store['url'] ) ? (string) $store['url'] : '';
			if ( '' === $url ) {
				continue;
			}

			// phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- deliberate: this function has zero WordPress dependency by design (see docblock), so it is directly unit-testable from a bare `php` CLI run with no WP bootstrap.
			$parsed = parse_url( $url );
			$host   = isset( $parsed['host'] ) ? strtolower( (string) $parsed['host'] ) : '';
			if ( '' === $host || $host !== $request_host ) {
				continue;
			}

			$path = isset( $parsed['path'] ) ? (string) $parsed['path'] : '';
			if ( '' === $path ) {
				$path = '/';
			}

			$len = strlen( $path );
			if ( 0 === strncmp( $request_path, $path, $len ) && $len > $best_len ) {
				$best     = $store;
				$best_len = $len;
			}
		}

		if ( null !== $best ) {
			return $best;
		}

		return $stores[0];
	}
}

if ( ! function_exists( 'sgs_store_selector_flag_size' ) ) {
	/**
	 * Read {w,h} for one tier out of the block's `flagSize` tiered-object
	 * attribute, falling back to the tier above (desktop is always concrete)
	 * and finally to the design default (16x12, U-12 §C).
	 *
	 * `flagSize` follows the same {desktop,tablet,mobile} tiered-object shape
	 * every other SGS block uses (helpers-responsive.php's
	 * sgs_responsive_normalise_object() — reused for this non-box shape too,
	 * since it only distinguishes tiered-vs-flat by key presence, not by
	 * box-ness). Call sgs_responsive_normalise_object() first and pass the
	 * result in here.
	 *
	 * @param array{desktop:?array,tablet:?array,mobile:?array} $tiers Result of
	 *        sgs_responsive_normalise_object( $attributes['flagSize'] ?? null, true ).
	 * @param string                                            $tier 'desktop'|'tablet'|'mobile'.
	 * @return array{w:int,h:int}
	 */
	function sgs_store_selector_flag_size( array $tiers, string $tier ): array {
		$default = array(
			'w' => 16,
			'h' => 12,
		);

		$order = array( 'desktop', 'tablet', 'mobile' );
		$idx   = array_search( $tier, $order, true );
		if ( false === $idx ) {
			$idx = 0;
		}

		// Walk from the requested tier back up to desktop; the first tier that
		// actually carries a value wins (tablet/mobile inherit desktop).
		for ( $i = (int) $idx; $i >= 0; $i-- ) {
			$candidate = $tiers[ $order[ $i ] ] ?? null;
			if ( is_array( $candidate ) && ( isset( $candidate['w'] ) || isset( $candidate['h'] ) ) ) {
				$w = isset( $candidate['w'] ) ? (int) $candidate['w'] : $default['w'];
				$h = isset( $candidate['h'] ) ? (int) $candidate['h'] : $default['h'];
				return array(
					'w' => $w > 0 ? $w : $default['w'],
					'h' => $h > 0 ? $h : $default['h'],
				);
			}
		}

		return $default;
	}
}
