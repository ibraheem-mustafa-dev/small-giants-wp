<?php
/**
 * Size-band labels for one variation axis — shared by the product page and the bag.
 *
 * Two callers read these functions, and both must agree on the letter a
 * shopper sees:
 *   - sgs/buybox (src/blocks/buybox/render.php) prints the band letter on each
 *     size tile, from the block's pickerBandAxis/pickerBandScale attributes;
 *   - the cart line summary (includes/cart-line-summary/) prints the same
 *     letter on the bag, cart, checkout and order email lines, from the
 *     client's own wording option.
 * Both pass the SAME per-product term list (Product_Manifest's cached `axes`)
 * through sgs_buybox_band_labels(), so a bag line can never disagree with the
 * tile the shopper clicked.
 *
 * Data prep only, no CSS — see buybox/render.php's own "picker band labels"
 * comment for why the band-letter swap happens in its per-axis loop rather
 * than here. Both functions are function_exists()-guarded, so including this
 * file from more than one caller in a request is safe.
 *
 * GENERIC: any block instance can name any axis taxonomy
 * and any ordered band scale — e.g. ("pa_frame-size",
 * "S:52,M:57,L") live in the site's build script,
 * never hardcoded here. The shop-wide `pa_size` facet (woo-seed/seed-facets.php)
 * is a SEPARATE, coarser per-product filter attribute (one Small/Medium/Large
 * term per product, for shop filtering) and cannot drive this control: this
 * axis needs a label PER TERM of the variation-forming axis itself (each
 * numeric lens width, e.g. "52", "55", "58"), read from the term's own name.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_parse_band_scale' ) ) {
	/**
	 * Parse the pickerBandScale mini-syntax into an ordered band list.
	 *
	 * Syntax: comma-separated "Label:max" pairs, e.g. "S:52,M:57,L" — the last
	 * entry may omit ":max" for an open-ended top band (anything larger than
	 * the previous band's max). Whitespace around each part is trimmed.
	 *
	 * @param string $raw Raw pickerBandScale attribute value.
	 * @return array<int, array{label: string, max: float|null}> Ordered bands, '' input = [].
	 */
	function sgs_buybox_parse_band_scale( string $raw ): array {
		$raw = trim( $raw );
		if ( '' === $raw ) {
			return array();
		}

		$bands = array();
		foreach ( explode( ',', $raw ) as $part ) {
			$part = trim( $part );
			if ( '' === $part ) {
				continue;
			}
			$pieces = explode( ':', $part, 2 );
			$label  = sanitize_text_field( trim( $pieces[0] ) );
			if ( '' === $label ) {
				continue;
			}
			$max = null;
			if ( isset( $pieces[1] ) && is_numeric( trim( $pieces[1] ) ) ) {
				$max = (float) trim( $pieces[1] );
			}
			$bands[] = array(
				'label' => $label,
				'max'   => $max,
			);
		}

		return $bands;
	}
}

if ( ! function_exists( 'sgs_buybox_band_labels' ) ) {
	/**
	 * Map each of an axis's OWN terms (already the frame's real sizes only —
	 * the manifest's per-product term list) to its band label, resolving the
	 * numeric value from the term's own name/label. Two terms landing in the
	 * SAME band (e.g. two sizes both "M") each get the letter plus their own
	 * number appended ("M 53", "M 56") so the tiles stay visually distinct —
	 * a single-band frame keeps the bare letter.
	 *
	 * A term whose label isn't numeric, or that falls outside every band
	 * (only possible with an incomplete scale), keeps its own raw label
	 * unchanged — never blank, never a guessed band.
	 *
	 * @param array $terms Axis terms for THIS product, each {slug, label, ...}.
	 * @param array $bands Ordered bands from sgs_buybox_parse_band_scale().
	 * @return array<string, string> term slug => band label.
	 */
	function sgs_buybox_band_labels( array $terms, array $bands ): array {
		if ( empty( $bands ) ) {
			return array();
		}

		// First pass: resolve each term's raw numeric value and band letter.
		$resolved    = array();
		$band_counts = array();
		foreach ( $terms as $term_row ) {
			$slug  = (string) ( $term_row['slug'] ?? '' );
			$label = (string) ( $term_row['label'] ?? '' );
			if ( '' === $slug || ! is_numeric( $label ) ) {
				continue;
			}
			$value      = (float) $label;
			$band_label = '';
			foreach ( $bands as $band ) {
				if ( null === $band['max'] || $value <= $band['max'] ) {
					$band_label = $band['label'];
					break;
				}
			}
			if ( '' === $band_label ) {
				continue;
			}
			$resolved[ $slug ]          = array(
				'band'  => $band_label,
				'value' => $label,
			);
			$band_counts[ $band_label ] = ( $band_counts[ $band_label ] ?? 0 ) + 1;
		}

		// Second pass: bare letter when this product has only one term in that
		// band, "letter + number" when it has more than one (collision).
		$map = array();
		foreach ( $resolved as $slug => $info ) {
			$map[ $slug ] = $band_counts[ $info['band'] ] > 1
				? $info['band'] . ' ' . $info['value']
				: $info['band'];
		}

		return $map;
	}
}
