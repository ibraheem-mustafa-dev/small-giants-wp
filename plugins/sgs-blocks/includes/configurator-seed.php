<?php
/**
 * Canonical lean-seed strip for the product-card 24 KB context cap.
 *
 * Provides sgs_lean_seed_combos() — THE single source of truth for removing
 * server-only fields from a manifest's combos array before the result is
 * serialised into data-wp-context or measured against the 24 KB cap.
 *
 * Three callers (as of backlog #17):
 *   1. src/blocks/product-card/render.php   — seeds data-wp-context.
 *   2. includes/class-product-preflight.php — lean_manifest_subset() measures the seed.
 *   3. tests/php/LeanSeedSizeTest.php       — regression size assertion.
 *
 * WARNING: any change to the strip logic here changes BOTH what lands in
 * data-wp-context (client-visible) AND what PREFLIGHT measures. Keep both
 * sides in sync — if you add a new server-only field to the manifest you
 * MUST also add it to the unset() call below.
 *
 * This file intentionally contains NO WordPress function calls so it can be
 * loaded by standalone PHPUnit tests without a WordPress environment.
 *
 * @package SGS\Blocks
 * @since   1.8.1
 */

if ( ! function_exists( 'sgs_lean_seed_combos' ) ) {
	/**
	 * Strip server-only fields from a manifest combos array for the 24 KB lean-seed.
	 *
	 * Applies the canonical strip used by the product-card render.php before
	 * seeding data-wp-context:
	 *   - Removes four server-only fields: sku, gtin, incMinor, saleEndDate.
	 *     view.js needs none of these; they exist only for JSON-LD / SEC-2 purposes.
	 *   - Empties the gallery array when it has fewer than 2 images. A 0/1-image
	 *     combo's view.js falls back to combo.imageUrl (the main image). Only a
	 *     gallery with >=2 images is kept in full, because the thumbnail strip needs
	 *     every entry.
	 *
	 * Keys in the returned array are identical to the input; values are new copies
	 * (the original $combos array is not mutated).
	 *
	 * @param array $combos Manifest combos array (keyed by combo key string).
	 * @return array Stripped combos keyed identically to $combos.
	 */
	function sgs_lean_seed_combos( array $combos ): array {
		$seed_combos = array();

		foreach ( $combos as $combo_key => $combo_data ) {
			// Strip four server-only fields that bloat the client seed.
			unset(
				$combo_data['sku'],
				$combo_data['gtin'],
				$combo_data['incMinor'],
				$combo_data['saleEndDate']
			);

			// Empty the gallery when it holds fewer than 2 images.
			// view.js uses combo.imageUrl as the main image source for 0/1-image combos
			// and falls back correctly — the gallery array is only needed when >=2
			// images are present (thumbnail strip). Keeping a 1-item gallery in the
			// seed wastes ~200 bytes per combo without providing any client value.
			// Defensive access: guard against a combo missing the gallery key entirely.
			if ( isset( $combo_data['gallery'] ) && is_array( $combo_data['gallery'] )
				&& count( $combo_data['gallery'] ) < 2 ) {
				$combo_data['gallery'] = array();
			}

			$seed_combos[ $combo_key ] = $combo_data;
		}

		return $seed_combos;
	}
}
