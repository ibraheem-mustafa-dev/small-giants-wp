<?php
/**
 * SGS Smart Bulk Pricing — cascade config resolver (Spec 28 P3, FR-28-6).
 *
 * Single public entry point: sgs_get_pack_pricing_config( int $product_id ).
 * Resolves the 3-layer cascade: site → category → product; most-specific wins.
 * Per-pack manual overrides are collected and merged in at product scope.
 *
 * Design:
 *   - Pure function over WordPress options/meta — no WC price reads here.
 *   - Tested by a standalone PHP runner (no WP env needed for unit tests on
 *     the resolver logic; the WP-I/O functions are injected via closures when
 *     called from the REST preview endpoint).
 *   - The engine (sgs_auto_pack_prices / sgs_charm_round) lives in
 *     class-pricing-engine.php; this file is glue-only, no maths.
 *
 * Cascade rule (FR-28-6): site → category → product.
 * Most-specific non-null value wins per key.
 * Per-pack manual overrides are an additive product-level map; they never
 * derive from site or category layers.
 *
 * Default values (magic numbers from Spec 28 §Principles):
 *   k             = 0.12   (Standard)
 *   pack_sizes    = [6,12,24,48]
 *   charm_round   = true
 *   vat_registered = true
 *   margin_floor  = 0.40
 *   cost_pence    = 0      (unknown — use abs min-floor)
 *
 * @package   SGS\Blocks
 * @since     1.14.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md §FR-28-6
 */

declare(strict_types=1);

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Canonical steepness-notch → k mapping (FR-28-3).
 */
const PACK_PRICING_K_MAP = array(
	'gentle'     => 0.08,
	'standard'   => 0.12,
	'aggressive' => 0.18,
);

/**
 * Default pack sizes (FR-28-10).
 */
const PACK_PRICING_DEFAULT_SIZES = array( 6, 12, 24, 48 );

/**
 * WordPress option key for site-level pack pricing defaults (FR-28-11).
 */
const PACK_PRICING_SITE_OPTION = 'sgs_pack_pricing_settings';

/**
 * Term-meta key for category-level k override (FR-28-6).
 * Stored as a notch string: 'gentle'|'standard'|'aggressive'.
 */
const PACK_PRICING_CAT_META_K = 'sgs_pack_k';

/**
 * Resolve the complete pack-pricing config for a product, applying the
 * site → category → product cascade (FR-28-6, highest specificity wins).
 *
 * Returned keys:
 *   k              float   Power-law steepness (0.08 / 0.12 / 0.18 or custom ≤0.18).
 *   pack_sizes     int[]   Sorted ascending array of pack counts (≥2, ≤500).
 *   charm_round    bool    Whether to charm-round (FR-28-2).
 *   vat_registered bool    Whether prices are displayed inc-VAT.
 *   margin_floor   float   Minimum gross-margin ratio (0.0–0.99).
 *   cost_pence     int     Per-unit cost in pence; 0 = unknown.
 *   base_pence     int     Single-item reference price in pence (from _sgs_base_price_pence).
 *   manual_overrides array  Map of pack_size (int) → int pence override; empty = none.
 *   source_k       string  Which layer supplied k: 'site'|'category'|'product'|'default'.
 *   source_sizes   string  Which layer supplied pack_sizes: 'site'|'product'|'default'.
 *
 * @param int $product_id WooCommerce product post ID.
 * @return array<string, mixed> Fully-resolved config.
 */
function sgs_get_pack_pricing_config( int $product_id ): array {
	// ── 1. Site defaults (lowest specificity) ───────────────────────────────
	$site_opts      = sgs_pack_pricing_site_options();
	$k              = (float) ( $site_opts['k'] ?? 0.12 );
	$pack_sizes     = sgs_pack_pricing_parse_sizes( $site_opts['pack_sizes'] ?? array() );
	$charm_round    = (bool) ( $site_opts['charm_round'] ?? true );
	$vat_registered = (bool) ( $site_opts['vat_registered'] ?? true );
	$margin_floor   = (float) ( $site_opts['margin_floor'] ?? 0.40 );
	$cost_pence     = (int) ( $site_opts['cost_pence'] ?? 0 );
	$source_k       = ( isset( $site_opts['k'] ) ) ? 'site' : 'default';
	$source_sizes   = ( ! empty( $site_opts['pack_sizes'] ) ) ? 'site' : 'default';

	// ── 2. Category override (mid specificity) ───────────────────────────────
	$cat_k = sgs_pack_pricing_category_k( $product_id );
	if ( null !== $cat_k ) {
		$k        = $cat_k;
		$source_k = 'category';
	}

	// ── 3. Product override (highest specificity) ────────────────────────────
	$prod_k_notch = get_post_meta( $product_id, '_sgs_pack_k', true );
	if ( '' !== $prod_k_notch ) {
		$resolved_k = sgs_pack_pricing_notch_to_k( (string) $prod_k_notch );
		if ( null !== $resolved_k ) {
			$k        = $resolved_k;
			$source_k = 'product';
		}
	}

	$prod_sizes_raw = get_post_meta( $product_id, '_sgs_pack_sizes', true );
	$prod_sizes     = sgs_pack_pricing_parse_sizes(
		is_array( $prod_sizes_raw ) ? $prod_sizes_raw : array()
	);
	if ( ! empty( $prod_sizes ) ) {
		$pack_sizes   = $prod_sizes;
		$source_sizes = 'product';
	}

	// Apply defaults when cascade produced nothing.
	if ( empty( $pack_sizes ) ) {
		$pack_sizes   = PACK_PRICING_DEFAULT_SIZES;
		$source_sizes = 'default';
	}

	// Base price — product-level only (Wave-2 #1, _sgs_base_price_pence).
	$base_pence = absint( get_post_meta( $product_id, '_sgs_base_price_pence', true ) );

	// Per-pack manual overrides — product-level additive map.
	$manual_raw       = get_post_meta( $product_id, '_sgs_pack_manual_overrides', true );
	$manual_overrides = sgs_pack_pricing_parse_manual_overrides( is_array( $manual_raw ) ? $manual_raw : array() );

	return array(
		'k'                => $k,
		'pack_sizes'       => $pack_sizes,
		'charm_round'      => $charm_round,
		'vat_registered'   => $vat_registered,
		'margin_floor'     => $margin_floor,
		'cost_pence'       => $cost_pence,
		'base_pence'       => $base_pence,
		'manual_overrides' => $manual_overrides,
		'source_k'         => $source_k,
		'source_sizes'     => $source_sizes,
	);
}

/**
 * Read and normalise the site-level pack pricing option.
 *
 * @return array<string, mixed>
 */
function sgs_pack_pricing_site_options(): array {
	$raw = get_option( PACK_PRICING_SITE_OPTION, array() );
	if ( ! is_array( $raw ) ) {
		return array();
	}

	$out = array();

	if ( isset( $raw['k_notch'] ) && '' !== $raw['k_notch'] ) {
		$k = sgs_pack_pricing_notch_to_k( (string) $raw['k_notch'] );
		if ( null !== $k ) {
			$out['k'] = $k;
		}
	}

	if ( isset( $raw['pack_sizes'] ) && is_array( $raw['pack_sizes'] ) ) {
		$out['pack_sizes'] = $raw['pack_sizes'];
	}

	if ( isset( $raw['charm_round'] ) ) {
		$out['charm_round'] = (bool) $raw['charm_round'];
	}

	if ( isset( $raw['vat_registered'] ) ) {
		$out['vat_registered'] = (bool) $raw['vat_registered'];
	}

	if ( isset( $raw['margin_floor'] ) && is_numeric( $raw['margin_floor'] ) ) {
		$mf = (float) $raw['margin_floor'];
		if ( $mf >= 0.0 && $mf < 1.0 ) {
			$out['margin_floor'] = $mf;
		}
	}

	if ( isset( $raw['cost_pence'] ) && is_numeric( $raw['cost_pence'] ) ) {
		$cp = (int) $raw['cost_pence'];
		if ( $cp >= 0 ) {
			$out['cost_pence'] = $cp;
		}
	}

	return $out;
}

/**
 * Resolve the most-specific category override for k on a given product.
 *
 * Walks the product_cat terms assigned to the product, resolves their k
 * notches, and returns the deepest (most-specific child) k value found.
 * Returns null when no category sets a k override.
 *
 * @param int $product_id WooCommerce product post ID.
 * @return float|null k value, or null when no category override exists.
 */
function sgs_pack_pricing_category_k( int $product_id ): ?float {
	$terms = get_the_terms( $product_id, 'product_cat' );
	if ( ! $terms || is_wp_error( $terms ) ) {
		return null;
	}

	// Prefer the deepest (most-specific child) term that has a k override.
	// Higher term_taxonomy_id = later insertion = likely a child; sort desc.
	usort(
		$terms,
		static function ( $a, $b ) {
			return (int) $b->term_id - (int) $a->term_id;
		}
	);

	foreach ( $terms as $term ) {
		$notch = get_term_meta( (int) $term->term_id, PACK_PRICING_CAT_META_K, true );
		if ( '' !== $notch ) {
			$k = sgs_pack_pricing_notch_to_k( (string) $notch );
			if ( null !== $k ) {
				return $k;
			}
		}
	}

	return null;
}

/**
 * Convert a notch string to a float k value.
 *
 * Accepts 'gentle'|'standard'|'aggressive' (FR-28-3) plus a numeric custom
 * value string (the "Custom %" escape hatch — pre-solved to a k value by the
 * caller).
 *
 * @param string $notch Notch identifier or numeric k string.
 * @return float|null k in (0, 0.18], or null when unrecognised / out-of-range.
 */
function sgs_pack_pricing_notch_to_k( string $notch ): ?float {
	$notch = strtolower( trim( $notch ) );

	if ( isset( PACK_PRICING_K_MAP[ $notch ] ) ) {
		return PACK_PRICING_K_MAP[ $notch ];
	}

	// Numeric custom k (back-solved from "Custom %" notch by the product field).
	if ( is_numeric( $notch ) ) {
		$k = (float) $notch;
		if ( $k > 0.0 && $k <= 0.18 ) {
			return $k;
		}
	}

	return null;
}

/**
 * Parse and validate a raw pack-sizes array.
 *
 * Each entry must be an integer 2–500.  Invalid entries are dropped silently.
 * Result is sorted ascending and deduplicated.  Returns [] when empty.
 *
 * @param mixed $raw Raw value from option or meta.
 * @return int[]
 */
function sgs_pack_pricing_parse_sizes( $raw ): array {
	if ( ! is_array( $raw ) ) {
		return array();
	}

	$sizes = array();
	foreach ( $raw as $n ) {
		$n = (int) $n;
		if ( $n >= 2 && $n <= 500 ) {
			$sizes[] = $n;
		}
	}

	$sizes = array_unique( $sizes );
	sort( $sizes );

	return array_values( $sizes );
}

/**
 * Parse and validate the per-pack manual overrides map.
 *
 * Input: array or JSON-encoded array of { "pack_size": price_pence } pairs.
 * Each override must be: pack_size ≥ 2, price_pence ≥ 2 (post-generation floor).
 *
 * @param mixed $raw Raw value from post meta.
 * @return array<int, int> Map of pack_size (int) → price_pence (int).
 */
function sgs_pack_pricing_parse_manual_overrides( $raw ): array {
	if ( is_string( $raw ) ) {
		$decoded = json_decode( $raw, true );
		$raw     = is_array( $decoded ) ? $decoded : array();
	}

	if ( ! is_array( $raw ) ) {
		return array();
	}

	$out = array();
	foreach ( $raw as $n => $pence ) {
		$n     = (int) $n;
		$pence = (int) $pence;
		if ( $n >= 2 && $n <= 500 && $pence >= 2 ) {
			$out[ $n ] = $pence;
		}
	}

	return $out;
}
