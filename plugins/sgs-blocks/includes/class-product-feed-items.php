<?php
/**
 * SGS Google Merchant Feed — per-variation item builder (FR-27-F2).
 *
 * Pure helpers (price formatting, XML escaping) plus the per-variation
 * <item> assembler. Kept in its own file so each file stays within the SGS
 * 300-line limit and the helpers are independently unit-testable without WP.
 *
 * SECURITY / DATA-INTEGRITY RULES (apply to every method below):
 *   SEC-1 — commerce values (price, availability, GTIN) come EXCLUSIVELY from
 *   Product_Manifest::build(); NEVER call wc_get_price_to_display or get_children.
 *   <!-- CI_GREP_ASSERT: merchant_feed_items_never_reads_wc_price_or_children -->
 *   SEC-7 — variant deep-link URL built from the variation's own server-side
 *   attributes only; $_GET and add_query_arg are never used.
 *   SEC-SSRF — g:image_link emitted only for same-origin attachments.
 *
 * @package SGS\Blocks
 * @since   1.15.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Feed_Items
 *
 * Builds the per-variation XML <item> fragment for the Google Merchant feed.
 * All public methods are pure-ish (no side-effects beyond string building) and
 * can be tested without a running WordPress install (pass mock data arrays).
 *
 * Escape audit (every emitted value):
 *   - Text (title/description/brand/availability): xml_esc() = htmlspecialchars ENT_XML1|ENT_QUOTES UTF-8.
 *   - URLs (g:link, g:image_link): esc_url_raw() THEN xml_esc() (second pass catches residual metachars).
 *   - Prices ('12.99 GBP'): format_price_field() — numeric-only output; xml_esc() applied anyway.
 *   - g:id / g:item_group_id: xml_esc() on the SKU/id string.
 *   - g:gtin: digits-only (stripped at manifest build) or literal 'false' — no user content.
 */
final class Product_Feed_Items {

	/**
	 * Build the <item> XML fragment for one variation combo.
	 *
	 * Returns an empty string when the combo is malformed or has no usable image
	 * that satisfies the same-origin rule.
	 *
	 * @param int    $product_id   Parent WC product ID.
	 * @param array  $combo        One combo entry from the manifest (must include
	 *                             variationId, incMinor, inStock, imageUrl, sku,
	 *                             gtin, saleMinor, saleEndDate).
	 * @param array  $manifest     Full manifest (for decimals key).
	 * @param string $parent_name  Parent product name (sanitised plain text).
	 * @param string $parent_desc  Parent product description (sanitised plain text).
	 * @param string $brand        Brand name resolved by caller (may be '').
	 * @param array  $combo_attrs  taxonomy → slug pairs for this combo (for title suffix + URL).
	 * @param array  $term_labels  taxonomy → slug → label pre-built lookup.
	 * @param string $parent_link  Canonical parent product permalink (already esc_url_raw'd).
	 * @param string $group_id     productGroupID (mirrors Product_Schema::build_script).
	 * @return string XML fragment, or '' on failure.
	 */
	public static function build_item(
		int $product_id,
		array $combo,
		array $manifest,
		string $parent_name,
		string $parent_desc,
		string $brand,
		array $combo_attrs,
		array $term_labels,
		string $parent_link,
		string $group_id
	): string {
		// Guard: combo must have a numeric inc-VAT price.
		if ( ! isset( $combo['incMinor'] ) || ! \is_numeric( $combo['incMinor'] ) ) {
			return '';
		}

		$variation_id = (int) ( $combo['variationId'] ?? 0 );
		if ( $variation_id <= 0 ) {
			return '';
		}

		$decimals = (int) ( $manifest['decimals'] ?? 2 );
		$currency = \get_woocommerce_currency(); // e.g. 'GBP'.

		// ── g:id ─────────────────────────────────────────────────────────────
		$sku = (string) ( $combo['sku'] ?? '' );
		$gid = '' !== $sku ? $sku : (string) $variation_id;

		// g:item_group_id: $group_id is pre-resolved by Product_Feed::build_feed()
		// using the SAME derivation as Product_Schema::product_group_id() (parent
		// SKU else (string) product_id) — feed↔schema stay byte-identical.

		// ── g:title ───────────────────────────────────────────────────────────
		$label_parts = array();
		foreach ( $combo_attrs as $tax => $slug ) {
			$label_parts[] = isset( $term_labels[ $tax ][ $slug ] )
				? $term_labels[ $tax ][ $slug ]
				: \sanitize_text_field( $slug );
		}
		$title = '' !== implode( '', $label_parts )
			? $parent_name . ' – ' . \implode( ', ', $label_parts )
			: $parent_name;

		// ── g:description (wp_strip_all_tags + trim; fallback parent name) ────
		$description = \trim( \wp_strip_all_tags( $parent_desc ) );
		if ( '' === $description ) {
			$description = $parent_name;
		}

		// ── g:link (SEC-7) ────────────────────────────────────────────────────
		$link = self::build_variant_url( $product_id, $variation_id, $parent_link );

		// ── g:image_link (SSRF guard) ─────────────────────────────────────────
		$image_url = (string) ( $combo['imageUrl'] ?? '' );
		$image_url = self::same_origin_url( $image_url );

		// Google requires g:image_link; skip the item when none is available.
		if ( '' === $image_url ) {
			return '';
		}

		// ── g:availability ────────────────────────────────────────────────────
		$availability = ! empty( $combo['inStock'] ) ? 'in_stock' : 'out_of_stock';

		// ── g:price (inc-VAT, SEC-2) ──────────────────────────────────────────
		$price_str = self::format_price_field( (int) $combo['incMinor'], $decimals, $currency );

		// ── g:gtin / g:identifier_exists ──────────────────────────────────────
		$gtin     = (string) ( $combo['gtin'] ?? '' );
		$gtin_tag = self::gtin_fragment( $gtin );

		// ── g:sale_price + g:sale_price_effective_date ────────────────────────
		$sale_fragment = '';
		$sale_minor    = $combo['saleMinor'] ?? null;
		if ( null !== $sale_minor && \is_numeric( $sale_minor ) ) {
			$sale_str      = self::format_price_field( (int) $sale_minor, $decimals, $currency );
			$sale_fragment = '    <g:sale_price>' . self::xml_esc( $sale_str ) . "</g:sale_price>\n";
			$sale_end      = (string) ( $combo['saleEndDate'] ?? '' );
			// Y-m-d only — a malformed date would emit an invalid ISO range (GMC rejection).
			// We hold the end date only → open start, end boundary 23:59 UTC.
			if ( 1 === \preg_match( '/^\d{4}-\d{2}-\d{2}$/', $sale_end ) ) {
				$sale_fragment .= '    <g:sale_price_effective_date>'
					. self::xml_esc( '1970-01-01T00:00+00:00/' . $sale_end . 'T23:59+00:00' )
					. "</g:sale_price_effective_date>\n";
			}
		}

		// ── Brand ─────────────────────────────────────────────────────────────
		$brand_tag = '' !== $brand
			? '    <g:brand>' . self::xml_esc( $brand ) . "</g:brand>\n"
			: '';

		// ── Assemble <item> ───────────────────────────────────────────────────
		$item  = "  <item>\n";
		$item .= '    <g:id>' . self::xml_esc( $gid ) . "</g:id>\n";
		$item .= '    <g:item_group_id>' . self::xml_esc( $group_id ) . "</g:item_group_id>\n";
		$item .= '    <title>' . self::xml_esc( $title ) . "</title>\n";
		$item .= '    <description>' . self::xml_esc( $description ) . "</description>\n";
		$item .= '    <link>' . self::xml_esc( \esc_url_raw( $link ) ) . "</link>\n";
		$item .= '    <g:image_link>' . self::xml_esc( \esc_url_raw( $image_url ) ) . "</g:image_link>\n";
		$item .= '    <g:availability>' . self::xml_esc( $availability ) . "</g:availability>\n";
		$item .= '    <g:price>' . self::xml_esc( $price_str ) . "</g:price>\n";
		$item .= '    <g:condition>new</g:condition>' . "\n";
		$item .= $gtin_tag;
		$item .= $brand_tag;
		$item .= $sale_fragment;
		$item .= "  </item>\n";

		return $item;
	}

	// ── Pure helpers (unit-testable without WP) ───────────────────────────────

	/**
	 * Escape a string for XML content: htmlspecialchars ENT_XML1 | ENT_QUOTES,
	 * UTF-8 — all five XML special characters (&, <, >, ", ') safely encoded.
	 *
	 * @param string $value Raw value.
	 * @return string XML-safe string.
	 */
	public static function xml_esc( string $value ): string {
		return \htmlspecialchars( $value, ENT_XML1 | ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * Format a minor-int price as a GMC price field string ('12.99 GBP').
	 *
	 * Uses the same division logic as Product_Schema::format_price() but appends
	 * the ISO 4217 currency code as required by Google Merchant Center.
	 *
	 * @param int    $minor_int Minor-unit integer (inc-VAT).
	 * @param int    $decimals  Number of decimal places (from manifest).
	 * @param string $currency  ISO 4217 currency code, e.g. 'GBP'.
	 * @return string e.g. '12.99 GBP'.
	 */
	public static function format_price_field( int $minor_int, int $decimals, string $currency ): string {
		$divisor = 10 ** \max( 0, $decimals );
		return \number_format( $minor_int / $divisor, $decimals, '.', '' ) . ' ' . $currency;
	}

	/**
	 * Return $url only when it shares the same host as the current site.
	 *
	 * Prevents SSRF vectors where an attacker-controlled product image URL could
	 * cause the server to make outbound requests when the feed is consumed.
	 *
	 * @param string $url Candidate URL (from manifest imageUrl).
	 * @return string The original URL if same-origin, or '' if external / invalid.
	 */
	public static function same_origin_url( string $url ): string {
		if ( '' === $url ) {
			return '';
		}
		$site_host  = (string) \wp_parse_url( \home_url(), PHP_URL_HOST );
		$image_host = (string) \wp_parse_url( $url, PHP_URL_HOST );
		if ( '' === $site_host || '' === $image_host ) {
			return '';
		}
		// Allow exact match or the www. variant of the same host (exact-prefix
		// strip only — ltrim with a charlist would mangle hosts like web.example.com).
		$normalise = static function ( string $h ): string {
			$h = \strtolower( $h );
			return ( 0 === \strpos( $h, 'www.' ) ) ? \substr( $h, 4 ) : $h;
		};
		if ( $normalise( $site_host ) !== $normalise( $image_host ) ) {
			return '';
		}
		return $url;
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * Build the SEC-7-compliant variant deep-link URL.
	 *
	 * Mirrors Product_Canonical::maybe_override(): reads the variation's own
	 * server-side attributes, validates each taxonomy+slug, builds the URL with
	 * http_build_query. $_GET and add_query_arg are never used. Falls back to
	 * the parent permalink on any resolution failure.
	 *
	 * @param int    $product_id   Parent product ID.
	 * @param int    $variation_id Variation ID.
	 * @param string $parent_link  Pre-resolved parent permalink.
	 * @return string Absolute URL.
	 */
	private static function build_variant_url( int $product_id, int $variation_id, string $parent_link ): string {
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return $parent_link;
		}

		$variation = \wc_get_product( $variation_id );
		if ( ! $variation || 'variation' !== $variation->get_type() ) {
			return $parent_link;
		}

		// Ownership gate (mirrors Product_Canonical): the variation must belong
		// to the bound parent product.
		if ( (int) $variation->get_parent_id() !== $product_id ) {
			return $parent_link;
		}

		$raw       = $variation->get_attributes();
		$validated = array();

		foreach ( $raw as $taxonomy => $slug ) {
			// Real taxonomy + real term only; '' = "Any" axis — skip.
			if ( '' === $slug || ! \taxonomy_exists( $taxonomy ) || ! \get_term_by( 'slug', $slug, $taxonomy ) ) {
				continue;
			}
			$validated[ 'attribute_' . $taxonomy ] = $slug;
		}

		if ( empty( $validated ) ) {
			return $parent_link;
		}

		\ksort( $validated );
		return $parent_link . '?' . \http_build_query( $validated );
	}

	/**
	 * Build the GTIN XML fragment for one item.
	 *
	 * Emits the correct g:gtin element for 8/12/13/14-digit GTINs, falls back
	 * to <g:identifier_exists>false</g:identifier_exists> when absent. NEVER
	 * fabricates a GTIN value.
	 *
	 * @param string $gtin Digits-only GTIN string (already stripped of non-digits
	 *                     by the manifest builder), or ''.
	 * @return string XML fragment.
	 */
	private static function gtin_fragment( string $gtin ): string {
		static $valid_lengths = array( 8, 12, 13, 14 );

		if ( '' !== $gtin && \in_array( \strlen( $gtin ), $valid_lengths, true ) ) {
			return '    <g:gtin>' . self::xml_esc( $gtin ) . "</g:gtin>\n";
		}
		return "    <g:identifier_exists>false</g:identifier_exists>\n";
	}
}
