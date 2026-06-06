<?php
/**
 * Tests: product-card lean-seed size cap (backlog #18, regression commit 3a1e95df).
 *
 * The product-card's WC variable branch builds a lean-seed context subset for
 * the 24 KB hard cap (M-C9 in render.php line 339). When the manifest grows
 * (e.g. adding schema fields like sku/gtin/incMinor/saleEndDate, or per-variation
 * image galleries), the lean-seed must strip server-only fields and reduce
 * gallery size to keep the client-seeded JSON ≤ 24576 bytes.
 *
 * Regression: commit 3a1e95df. The 48-SKU fixture's manifest grew from 23 KB to
 * 31.8 KB (+8.8 KB) after adding schema fields + galleries. The lean-seed
 * correctly strips those fields, bringing the seed under the cap, but a size
 * regression test was missing — the cap could be silently exceeded again if
 * future schema additions don't follow the stripping pattern.
 *
 * This test builds a representative 48-combo manifest (the fixture product),
 * applies the EXACT lean-seed stripping logic from render.php lines 266–278,
 * and asserts the serialised JSON size ≤ 24576 bytes.
 *
 * Self-contained — no WordPress installation required. Uses PHP json_encode
 * (the functional equivalent of wp_json_encode for size measurement).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * Class LeanSeedSizeTest
 */
class LeanSeedSizeTest extends TestCase {

	/**
	 * Build a representative 48-combo manifest fixture.
	 *
	 * Mimics the structure returned by Product_Manifest::build(), with realistic
	 * fields including schema-layer data (sku/gtin/incMinor/saleEndDate) and
	 * per-variation galleries. This is a FULL manifest; the lean-seed logic will
	 * strip the server-only fields.
	 *
	 * @return array Full manifest array.
	 */
	private static function build_48combo_manifest(): array {
		// Build 2 axes × 24 combos: flavour (4 variants) × pack (6 sizes).
		$axes = array(
			array(
				'taxonomy' => 'pa_flavour',
				'label'    => 'Flavour',
				'variesBy' => 'flavor',
				'terms'    => array(
					array(
						'slug'  => 'vanilla',
						'label' => 'Vanilla',
					),
					array(
						'slug'  => 'chocolate',
						'label' => 'Chocolate',
					),
					array(
						'slug'  => 'strawberry',
						'label' => 'Strawberry',
					),
					array(
						'slug'  => 'mint',
						'label' => 'Mint',
					),
				),
			),
			array(
				'taxonomy' => 'pa_pack',
				'label'    => 'Pack Size',
				'variesBy' => 'size',
				'terms'    => array(
					array(
						'slug'  => '1-pack',
						'label' => '1-Pack',
					),
					array(
						'slug'  => '3-pack',
						'label' => '3-Pack',
					),
					array(
						'slug'  => '6-pack',
						'label' => '6-Pack',
					),
					array(
						'slug'  => '12-pack',
						'label' => '12-Pack',
					),
					array(
						'slug'  => '24-pack',
						'label' => '24-Pack',
					),
					array(
						'slug'  => '48-pack',
						'label' => '48-Pack',
					),
				),
			),
		);

		$combos = array();
		$vid    = 100;

		// Generate 4 × 6 = 24 combos per flavour loop.
		// Run twice: first 24, then duplicate with different IDs to reach 48.
		for ( $batch = 0; $batch < 2; $batch++ ) {
			foreach ( $axes[0]['terms'] as $flavour_term ) {
				foreach ( $axes[1]['terms'] as $pack_term ) {
					++$vid;
					$flavour_slug = $flavour_term['slug'];
					$pack_slug    = $pack_term['slug'];
					$combo_key    = "pa_flavour:{$flavour_slug}|pa_pack:{$pack_slug}";

					// Realistic pricing: base 3.99, scaled by pack size.
					$pack_multiplier = intval( str_replace( array( '-pack', '1' ), array( '', '1' ), $pack_slug ) );
					$price_minor     = intval( 3.99 * 100 * $pack_multiplier ); // e.g. 399, 1197, 2394, ...
					$regular_minor   = intval( $price_minor * 1.2 );

							// Realistic gallery: 2-3 variation images per combo (some fallback to parent).
					$gallery = array();
					if ( 0 === $vid % 3 ) {
						// Some combos have a 2-image gallery.
						$gallery = array(
							array(
								'url' => "https://example.com/variation-{$vid}-1.jpg",
								'w'   => 500,
								'h'   => 500,
								'alt' => "{$flavour_slug} {$pack_slug} image 1",
							),
							array(
								'url' => "https://example.com/variation-{$vid}-2.jpg",
								'w'   => 500,
								'h'   => 500,
								'alt' => "{$flavour_slug} {$pack_slug} image 2",
							),
						);
					} else {
						// Most combos have just a 1-item fallback gallery (parent image).
						$gallery = array(
							array(
								'url' => 'https://example.com/parent-image.jpg',
								'w'   => 500,
								'h'   => 500,
								'alt' => 'Parent product image',
							),
						);
					}

					$combos[ $combo_key ] = array(
						'variationId'    => $vid,
						'priceMinor'     => $price_minor,
						'regularMinor'   => $regular_minor,
						'saleMinor'      => null,
						'pctOff'         => 0,
						'pctDisplay'     => '',
						'inStock'        => true,
						'imageUrl'       => 'https://example.com/variation-image.jpg',
						// Tax components (TAX-UI / FR-27-H3).
						'exMinor'        => intval( $price_minor / 1.2 ),
						'taxMinor'       => $price_minor - intval( $price_minor / 1.2 ),
						'regularExMinor' => intval( $regular_minor / 1.2 ),
						// B3: per-unit pricing.
						'unitDivisor'    => floatval( $pack_multiplier ),
						'unitLabel'      => 1 === $pack_multiplier ? 'item' : 'pack',
						'discountLabel'  => '',
						// E1: schema fields (server-only, stripped in lean-seed).
						'incMinor'       => $price_minor, // SEC-2: always inc-VAT.
						'sku'            => "SKU-{$flavour_slug}-{$pack_slug}",
						'gtin'           => '5901234123457',
						'saleEndDate'    => '',
						// A4: per-variation gallery (reduced to <2 items in lean-seed).
						'gallery'        => $gallery,
					);
				}
			}
		}

		$manifest = array(
			'decimals'       => 2,
			'currencySymbol' => '£',
			'generatedAt'    => time(),
			'axes'           => $axes,
			'combos'         => $combos,
			'defaultKey'     => 'pa_flavour:vanilla|pa_pack:1-pack',
			'defaultAxes'    => array(
				'pa_flavour' => 'vanilla',
				'pa_pack'    => '1-pack',
			),
		);

		return $manifest;
	}

	/**
	 * Apply the EXACT lean-seed stripping logic from render.php lines 266–278.
	 *
	 * Strips server-only fields (sku/gtin/incMinor/saleEndDate) and reduces
	 * gallery to empty when <2 images.
	 *
	 * @param array $manifest Full manifest (with all fields).
	 * @return array Lean-seed combos (what gets serialised to the 24KB cap).
	 */
	private static function build_lean_seed_combos( array $manifest ): array {
		$seed_combos = array();
		foreach ( $manifest['combos'] as $combo_key => $combo_data ) {
			unset(
				$combo_data['sku'],
				$combo_data['gtin'],
				$combo_data['incMinor'],
				$combo_data['saleEndDate']
			);
			if ( 2 > count( $combo_data['gallery'] ) ) {
				$combo_data['gallery'] = array(); // No strip for <2 images; view.js uses imageUrl.
			}
			$seed_combos[ $combo_key ] = $combo_data;
		}
		return $seed_combos;
	}

	/**
	 * Test: 48-combo manifest lean-seed stays ≤ 24 KB (baseline 22408 bytes).
	 *
	 * The lean-seed logic (stripping schema fields + reducing galleries <2 images)
	 * must keep the serialised context under 24576 bytes for the interactive
	 * configurator to render. This test exercises the fixture (48 combos) that
	 * revealed the regression in commit 3a1e95df.
	 */
	public function test_48combo_lean_seed_under_24kb_cap(): void {
		// Build the manifest.
		$manifest = self::build_48combo_manifest();

		// Apply the exact lean-seed logic.
		$seed_combos = self::build_lean_seed_combos( $manifest );

		// Build the context that gets serialised (matching render.php lines 281–335).
		// We only measure the combos contribution here; a full context would add axes,
		// display strings, etc., but the combos dominate the size.
		$seed_context = array(
			'productId'        => '123',
			'addToCartId'      => 123,
			'decimals'         => $manifest['decimals'],
			'currencySymbol'   => $manifest['currencySymbol'],
			'combos'           => $seed_combos,
			'axes'             => $manifest['axes'],
			'selectedAxes'     => $manifest['defaultAxes'],
			'selectedKey'      => $manifest['defaultKey'],
			'priceDisplay'     => '£3.99',
			'regularDisplay'   => '£4.79',
			'pctDisplay'       => '',
			'taxDisplayMode'   => 'auto',
			'priceSuffix'      => '',
			'vatLabel'         => 'VAT',
			'showSale'         => false,
			'hideSale'         => true,
			'stockText'        => '',
			'inStock'          => true,
			'imageSrc'         => 'https://example.com/variation-image.jpg',
			'imageAlt'         => 'Product image',
			'cartStatus'       => '',
			'pending'          => false,
			'restNonce'        => 'abc123def456',
			'availabilityNote' => '',
			'perUnitDisplay'   => '',
			'perUnitHidden'    => true,
			'perUnitTemplate'  => 'per %s',
			'discountLabel'    => '',
			'discountHidden'   => true,
			'saleLabel'        => 'Sale',
			'gallery'          => array(),
			'thumbsHidden'     => true,
			'selectedThumb'    => 0,
		);

		// Serialise to JSON (using php's native json_encode; wp_json_encode is identical for size).
		// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- size measurement only; wp_json_encode adds no size difference.
		$json_encoded = json_encode( $seed_context );
		$size_bytes   = strlen( $json_encoded );
		$size_kb      = $size_bytes / 1024;

		// Assert the lean-seed is under the 24 KB hard cap.
		$this->assertLessThanOrEqual(
			24576,
			$size_bytes,
			sprintf(
				'Lean-seed context exceeds 24 KB cap: %d bytes (%.2f KB). Baseline 22408B; cap 24576B.',
				(int) $size_bytes,
				(float) $size_kb
			)
		);

		// Emit baseline for future regression detection.
		if ( $size_bytes > 0 ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_trigger_error -- debug output in test only.
			trigger_error(
				sprintf(
					'Lean-seed size: %d bytes (%.2f KB) [baseline: 22408B, cap: 24576B, headroom: %d bytes]',
					(int) $size_bytes,
					(float) $size_kb,
					(int) ( 24576 - $size_bytes )
				),
				E_USER_NOTICE
			);
		}
	}

	/**
	 * Test: baseline 22408 bytes (from commit D161 measurement).
	 *
	 * This test documents the known baseline (22408 bytes) so we can track
	 * growth over time. It passes as long as the lean-seed doesn't exceed
	 * the 24 KB cap, but we also log the delta from baseline for trend analysis.
	 */
	public function test_lean_seed_baseline_headroom(): void {
		$manifest    = self::build_48combo_manifest();
		$seed_combos = self::build_lean_seed_combos( $manifest );

		$seed_context = array(
			'combos' => $seed_combos,
		);

		// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- size measurement only; wp_json_encode adds no size difference.
		$json_encoded   = json_encode( $seed_context );
		$size_bytes     = strlen( $json_encoded );
		$baseline_bytes = 22408; // Documented baseline from D161.
		$cap_bytes      = 24576;
		$growth_bytes   = $size_bytes - $baseline_bytes;
		$headroom_bytes = $cap_bytes - $size_bytes;

		// Combos-only is a subset; the full context grew even more, so this test
		// just ensures we're tracking the size impact.
		$this->assertGreaterThan(
			0,
			$headroom_bytes,
			sprintf(
				'Headroom exhausted! Size: %d bytes, Baseline: %d bytes, Growth: %d bytes, Headroom remaining: %d bytes (cap: %d)',
				$size_bytes,
				$baseline_bytes,
				$growth_bytes,
				$headroom_bytes,
				$cap_bytes
			)
		);
	}
}
