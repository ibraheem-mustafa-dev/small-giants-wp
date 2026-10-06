<?php
/**
 * Deep-link variation preselection: open a product page on a chosen option.
 *
 * A product card's colour swatch rewrites that card's product link to carry
 * `attribute_{taxonomy}={slug}` (includes/product-card-swatches.php plus
 * src/blocks/product-card/view.js). This file is the reading half: a block that
 * has built a manifest hands it to sgs_preselect_apply_to_manifest(), which
 * replaces `defaultKey` / `defaultAxes` with the requested combination so every
 * downstream read — the seeded context, the picker's `defaultSelected`, the SSR
 * price and photo — opens on the shopper's choice rather than the product's own
 * default.
 *
 * The URL value is never trusted. It is only ever used to look up a key in a
 * PHP array built from the product's own terms, and it has to survive four
 * filters first:
 *
 *  1. The taxonomy is never taken from the URL at all — the loop walks the
 *     manifest's own axes, so only attributes this product actually varies by
 *     are ever looked for, each run through sanitize_key().
 *  2. The value is run through sanitize_title(), the same transform
 *     WooCommerce applies when it saves an attribute term slug.
 *  3. It must match one of THAT product's own term slugs on THAT axis, by
 *     strict in_array() comparison. Anything else is dropped outright rather
 *     than passed on — an off-enum value handed to a block attribute silently
 *     coerces to the attribute default, which would hide the rejection.
 *  4. The assembled combo key must exist in the manifest's `combos` map. A
 *     combination of individually valid terms that is not a real variation
 *     discards the whole override and leaves the product's own default in place.
 *
 * Nothing here reaches a database query, so there is no statement to prepare;
 * the value's only destination is an array index and, through the manifest, an
 * esc_attr()'d context value.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_preselect_axes_from_url' ) ) {
	/**
	 * The requested term slug per axis, keyed by taxonomy.
	 *
	 * @param array $axes The manifest's `axes` list — each entry has a
	 *                    `taxonomy` and a `terms` list of `{slug, label}`.
	 * @return array<string, string> Validated taxonomy => slug pairs; empty when
	 *                               the URL asks for nothing valid.
	 */
	function sgs_preselect_axes_from_url( array $axes ): array {
		$chosen = array();

		foreach ( $axes as $axis ) {
			$taxonomy = sanitize_key( (string) ( $axis['taxonomy'] ?? '' ) );
			if ( '' === $taxonomy ) {
				continue;
			}

			$param = 'attribute_' . $taxonomy;
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- A shareable read-only deep link into a public product page; it selects a display option and performs no action, so a nonce would break the link on share and protects nothing.
			if ( ! isset( $_GET[ $param ] ) || ! is_scalar( $_GET[ $param ] ) ) {
				continue;
			}
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- See above.
			$requested = sanitize_title( wp_unslash( (string) $_GET[ $param ] ) );
			if ( '' === $requested ) {
				continue;
			}

			$allowed = array();
			foreach ( (array) ( $axis['terms'] ?? array() ) as $term ) {
				$slug = (string) ( $term['slug'] ?? '' );
				if ( '' !== $slug ) {
					$allowed[] = $slug;
				}
			}

			if ( in_array( $requested, $allowed, true ) ) {
				$chosen[ $taxonomy ] = $requested;
			}
		}

		return $chosen;
	}
}

if ( ! function_exists( 'sgs_preselect_apply_to_manifest' ) ) {
	/**
	 * Point a manifest's default at the combination the URL asks for.
	 *
	 * @param array $manifest A Product_Manifest::build() result.
	 * @return array The manifest, with `defaultKey` and `defaultAxes` moved to
	 *               the requested combination when it is a real variation, and
	 *               returned untouched otherwise.
	 */
	function sgs_preselect_apply_to_manifest( array $manifest ): array {
		$axes = isset( $manifest['axes'] ) && is_array( $manifest['axes'] ) ? $manifest['axes'] : array();
		if ( empty( $axes ) ) {
			return $manifest;
		}

		$chosen = sgs_preselect_axes_from_url( $axes );
		if ( empty( $chosen ) ) {
			return $manifest;
		}

		// The URL may name one axis out of several; the rest stay on the
		// product's own default so the result is always a complete combination.
		$wanted = array_merge(
			isset( $manifest['defaultAxes'] ) && is_array( $manifest['defaultAxes'] ) ? $manifest['defaultAxes'] : array(),
			$chosen
		);
		ksort( $wanted );

		$parts = array();
		foreach ( $wanted as $taxonomy => $slug ) {
			$parts[] = $taxonomy . ':' . $slug;
		}
		$combo_key = implode( '|', $parts );

		if ( ! isset( $manifest['combos'][ $combo_key ] ) ) {
			return $manifest;
		}

		$manifest['defaultKey']  = $combo_key;
		$manifest['defaultAxes'] = $wanted;

		return $manifest;
	}
}
