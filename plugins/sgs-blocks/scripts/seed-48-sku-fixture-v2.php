<?php
/**
 * SGS 48-SKU Fixture — v2 ADDITIVE presentation-meta seeder (Spec 27 Phase 2).
 *
 * Runs AFTER seed-48-sku-fixture.php has created the 48-SKU variable product
 * (detected via the `_sgs_fixture` postmeta flag). This script is ADDITIVE — it
 * does NOT delete or recreate the product; it only seeds the Phase-2 presentation
 * meta every Phase-2 unit (B2 swatches / B3 per-unit / A4 gallery / E1 schema)
 * tests against:
 *
 *   TERM META (pa_size / pa_flavour terms):
 *     _sgs_variesby_value  → 'size' on pa_size terms (valid Google enum);
 *                            LEFT UNSET on pa_flavour (no enum → tests the
 *                            unmapped→additionalProperty path in E1).
 *     _sgs_swatch_color    → a per-flavour hex on every pa_flavour term.
 *
 *   VARIATION POSTMETA (each of the 48 variations):
 *     _sgs_unit_divisor    → pack count parsed from the size slug (12/24/48/96).
 *     _sgs_unit_label      → 'bar' (so per-unit reads "£x.xx per bar", not "per unit").
 *     _sgs_variation_gallery → up to 3 real image-attachment ids on TWO variations
 *                              (only if image attachments exist; else skipped + noted).
 *     _sgs_discount_label  → a digit-free cosmetic label on the sale variation.
 *     global_unique_id     → a 13-digit GTIN on the first variation of each size.
 *
 * NOTE: update_term_meta()/update_post_meta() bypass register_meta()'s
 * sanitize_callback (that only runs on REST / meta-box writes), so this script
 * writes already-clean values directly. The sanitisers protect the authoring
 * (REST/UI) path, verified separately.
 *
 * HOW TO RUN (server, guard-blocked locally): via a token-gated webroot one-shot
 * that require()s wp-load.php then require()s this file. (See the deploy step.)
 *
 * Fixture/seed scripts are exempt from the 300-line limit (CLAUDE.md).
 *
 * @package SGS_Blocks
 */

if ( ! function_exists( 'wc_get_product' ) ) {
	echo "WooCommerce not active.\n";
	return;
}

// ─── Locate the fixture parent ───
$fixture_ids = get_posts(
	array(
		'post_type'      => 'product',
		'posts_per_page' => 1,
		'post_status'    => 'any',
		'meta_key'       => '_sgs_fixture', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
		'fields'         => 'ids',
	)
);
$parent_id = ! empty( $fixture_ids ) ? (int) $fixture_ids[0] : 0;
if ( ! $parent_id ) {
	echo "No fixture product found (run seed-48-sku-fixture.php first).\n";
	return;
}
$parent = wc_get_product( $parent_id );
if ( ! $parent || ! $parent->is_type( 'variable' ) ) {
	echo "Fixture {$parent_id} is not a variable product.\n";
	return;
}
echo "Fixture parent: {$parent_id}\n";

// ─── 1. variesBy on the SIZE axis terms (valid enum); flavour left unmapped ───
$size_terms = get_terms(
	array(
		'taxonomy'   => 'pa_size',
		'hide_empty' => false,
	)
);
if ( ! is_wp_error( $size_terms ) ) {
	foreach ( $size_terms as $tax_term ) {
		update_term_meta( $tax_term->term_id, '_sgs_variesby_value', 'size' );
	}
	echo 'variesBy=size set on ' . count( $size_terms ) . " pa_size terms (pa_flavour intentionally left unmapped).\n";
}

// ─── 2. Swatch colours on the FLAVOUR axis terms ───
$flavour_hex = array(
	'vanilla'    => '#f3e5ab',
	'chocolate'  => '#5c4033',
	'strawberry' => '#fc5a8d',
	'mango'      => '#ffb347',
	'banana'     => '#ffe135',
	'coffee'     => '#6f4e37',
	'mint'       => '#98ff98',
	'caramel'    => '#c68e17',
	'coconut'    => '#f8f0e3',
	'pistachio'  => '#93c572',
	'lemon'      => '#fff44f',
	'honey'      => '#ffb300',
);
$flavour_terms = get_terms(
	array(
		'taxonomy'   => 'pa_flavour',
		'hide_empty' => false,
	)
);
$swatch_count = 0;
if ( ! is_wp_error( $flavour_terms ) ) {
	foreach ( $flavour_terms as $tax_term ) {
		if ( isset( $flavour_hex[ $tax_term->slug ] ) ) {
			update_term_meta( $tax_term->term_id, '_sgs_swatch_color', $flavour_hex[ $tax_term->slug ] );
			++$swatch_count;
		}
	}
}
echo "Swatch colours set on {$swatch_count} pa_flavour terms.\n";

// ─── 3. Find up to 3 image attachments for the gallery test ───
$image_ids = get_posts(
	array(
		'post_type'      => 'attachment',
		'post_mime_type' => 'image',
		'posts_per_page' => 3,
		'post_status'    => 'inherit',
		'fields'         => 'ids',
	)
);
$have_gallery = count( $image_ids ) > 0;

// ─── 4. Per-variation meta ───
$children       = $parent->get_children();
$divisor_count  = 0;
$gallery_set    = 0;
$gtin_set       = 0;
$gtin_seen_size = array();
$sale_labelled  = false;

foreach ( $children as $i => $variation_id ) {
	$variation = wc_get_product( $variation_id );
	if ( ! $variation ) {
		continue;
	}
	$atts      = $variation->get_attributes(); // [ 'pa_size' => '12-pack', 'pa_flavour' => 'vanilla' ].
	$size_slug = $atts['pa_size'] ?? '';

	// Per-unit divisor = pack count parsed from the size slug ("12-pack" → 12).
	if ( preg_match( '/^(\d+)/', (string) $size_slug, $m ) ) {
		update_post_meta( $variation_id, '_sgs_unit_divisor', (int) $m[1] );
		update_post_meta( $variation_id, '_sgs_unit_label', 'bar' );
		++$divisor_count;
	}

	// Gallery on the first two variations only.
	if ( $have_gallery && $gallery_set < 2 ) {
		update_post_meta( $variation_id, '_sgs_variation_gallery', array_map( 'intval', $image_ids ) );
		++$gallery_set;
	}

	// One GTIN per size (first variation of each size).
	if ( '' !== $size_slug && ! isset( $gtin_seen_size[ $size_slug ] ) && method_exists( $variation, 'set_global_unique_id' ) ) {
		$gtin = '50100000000' . str_pad( (string) ( $gtin_set + 10 ), 2, '0', STR_PAD_LEFT ); // 13-digit-ish.
		$variation->set_global_unique_id( $gtin );
		$variation->save();
		$gtin_seen_size[ $size_slug ] = true;
		++$gtin_set;
	}

	// Digit-free cosmetic label on the scheduled-sale variation (48-pack vanilla).
	if ( ! $sale_labelled && '48-pack' === $size_slug && 'vanilla' === ( $atts['pa_flavour'] ?? '' ) ) {
		update_post_meta( $variation_id, '_sgs_discount_label', 'Best value' );
		$sale_labelled = true;
	}
}

echo "Per-unit divisor+label set on {$divisor_count} variations.\n";
echo 'Gallery set on ' . $gallery_set . ' variations' . ( $have_gallery ? '' : ' (NO image attachments found — gallery skipped)' ) . ".\n";
echo "GTIN set on {$gtin_set} variations (one per size).\n";
echo 'Discount label on sale variation: ' . ( $sale_labelled ? 'yes ("Best value")' : 'NOT FOUND' ) . "\n";

// Bust the manifest so the next render picks up the new presentation meta.
delete_transient( 'sgs_manifest_' . $parent_id );

echo "\n=== fixture-v2 DONE (manifest transient busted) ===\n";
